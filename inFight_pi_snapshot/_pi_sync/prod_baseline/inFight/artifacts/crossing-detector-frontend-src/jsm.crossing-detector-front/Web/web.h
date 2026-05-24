#pragma once
#include "../CrossingReader/crossings.h"
#include "../log.hpp"

#include <vector>
#include <thread>

#include <drogon/drogon.h>


class Crossings : public drogon::HttpController<Crossings>
{
public:
    METHOD_LIST_BEGIN
        METHOD_ADD(Crossings::Start, "/start");
        METHOD_ADD(Crossings::Stop, "/stop");
    METHOD_LIST_END
    static void SendCrossing(CrossReader::Crossing cross, unsigned long long startTime);
    static void SendLongCross(unsigned long long crossTime);
private:
    void Start(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    void Stop(const drogon::HttpRequestPtr& req, std::function<void(const drogon::HttpResponsePtr&)>&& callback);
    static std::deque<drogon::HttpClientPtr> GetCoreClientFromConfig();
};