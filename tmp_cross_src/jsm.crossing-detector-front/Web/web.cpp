#include "web.h"
#include "../CrossingReader/crossings.h"

#include <fstream>
#include <deque>


void Crossings::SendCrossing(CrossReader::Crossing cross, unsigned long long startTime)
{
	static auto clients = GetCoreClientFromConfig();

	Json::Value result;
	result["cross"] = (Json::Value::UInt64)cross.startTs;
	result["end"] = (Json::Value::UInt64)cross.endTs;
	result["delta"] = (Json::Value::UInt64)(cross.endTs - startTime);	
	
	for (auto client : clients) 
	{
		auto request = drogon::HttpRequest::newHttpJsonRequest(result);
		request->setPath("/round/crossed");
		request->setMethod(drogon::Post);

		SLOG("Send cross, result: " << client->sendRequest(request).first << " address: " << client->getHost() << " start time: " << cross.startTs << " end time: " << cross.endTs);
	}
}

void Crossings::SendLongCross(unsigned long long crossTime)
{
	static auto clients = GetCoreClientFromConfig();

	Json::Value result;
	result["duration"] = (Json::Value::UInt64)crossTime;

	for (auto client : clients)
	{
		auto request = drogon::HttpRequest::newHttpJsonRequest(result);
		request->setPath("/round/crossed/long");
		request->setMethod(drogon::Post);

		SLOG("Send long cross, result: " << client->sendRequest(request).first << " address: " << client->getHost() << " duration: " << crossTime);
	}
}

void Crossings::Start(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback)
{
	LOG("Request start")

	auto crossTime = CrossReader::StartRead();

	Json::Value responseJson;
	responseJson["cross"] = (Json::Value::UInt64)crossTime;
	
	auto resp = drogon::HttpResponse::newHttpJsonResponse(responseJson);
	if (crossTime == 0)
		resp->setStatusCode(drogon::k409Conflict);

	callback(resp);
	
	SLOG("Start result:" << std::endl << responseJson)
}

void Crossings::Stop(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback)
{
	LOG("Request stop")

	CrossReader::StopRead();

	auto last = CrossReader::GetLastCrossing().startTs;
	auto first = CrossReader::GetFirstCrossing().startTs;

	Json::Value result;
	result["result"] = (Json::Value::UInt64)(std::min(last, first) == 0 ? 0 : last - first);
	callback(drogon::HttpResponse::newHttpJsonResponse(result));
	SLOG("Stop result:" << std::endl << result)

	callback(drogon::HttpResponse::newHttpResponse());
}

std::deque<drogon::HttpClientPtr> Crossings::GetCoreClientFromConfig()
{
	std::ifstream mapFile("detectorConfig.json", std::ifstream::binary);

	Json::Value Json;

	Json::CharReaderBuilder builder;

	std::deque<drogon::HttpClientPtr> result;

	std::string errs;
	bool parsingSuccess = Json::parseFromStream(builder, mapFile, &Json, &errs);

	if (parsingSuccess)
	{
		for (auto& hostAddress : Json["sendAddress"])
		{
			auto client = drogon::HttpClient::newHttpClient(hostAddress.asString());
			result.push_back(client);
		}
	}

	mapFile.close();

	return result;
}
