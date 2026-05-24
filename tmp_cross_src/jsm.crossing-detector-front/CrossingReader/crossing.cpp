#include "crossings.h"
#include "../Web/web.h"

#include <iostream>
#include <algorithm>
#include <chrono>
#include <unistd.h>
#include <fcntl.h>
#include <string.h>
#include <poll.h>
#include <dirent.h>
#include <sys/stat.h>
#include <gpiod.h>


void CrossReader::ResetStaticProp()
{
	crossings.clear();
	unparsedMeasures.clear();
	oldMeasures.fill(CrossingMeasure());
}

unsigned long long CrossReader::StartReadStaticProp()
{
	if (work) return 0;
	try
	{
		ResetStaticProp();
		std::promise<unsigned long long> promise;
		future = &promise;
		auto result = promise.get_future();

		SetRelay(true);
		std::this_thread::sleep_for(std::chrono::milliseconds(200));
		try
		{
			SingleRead();
			unparsedMeasures.clear();
		}
		catch (...) {}
		firstTime = std::chrono::duration_cast<std::chrono::milliseconds>(
			std::chrono::system_clock::now().time_since_epoch()).count();
		work = true;
		sendFirst = true;
		readThread = std::thread([&]() { while (work) { if (auto p = poll(&my_poll, 1, 500); p > 0) { SingleRead(); ParseReadedMeasures(); } } });
		debugThread = std::thread([&]() { while (work) { DebugTick(); std::this_thread::sleep_for(std::chrono::seconds(1)); } });
		LOG("Start read");
		return result.get();
	}
	catch (std::exception e)
	{
		std::cerr << e.what() << std::endl;
		return 0;
	}

	return 0;
}

void CrossReader::StopReadStaticProp()
{
	if (!work) return;
	try
	{
		work = false;
		readThread.join();
		readThread = {};
		debugThread.join();
		debugThread = {};

		SetRelay(false);

		LOG("Stop read")
	}
	catch(...) {}

	if (future)
	{
		future->set_value(0);
		future = nullptr;
	}
}

CrossReader::Crossing CrossReader::GetFirstCrossingStaticProp()
{
	if (crossings.empty())
		return Crossing();

    return crossings.front();
}

CrossReader::Crossing CrossReader::GetLastCrossingStaticProp()
{
	if (crossings.empty())
		return Crossing();

    return crossings.back();
}

CrossReader& CrossReader::Get()
{
	static CrossReader inst;
	return inst;
}

CrossReader::CrossReader()
{
	std::ifstream mapFile("detectorConfig.json", std::ifstream::binary);

	Json::Value Json;

	Json::CharReaderBuilder builder;
	std::string errs;
	bool parsingSuccess = Json::parseFromStream(builder, mapFile, &Json, &errs);

	if (parsingSuccess)
	{
		relePin = Json["relePin"].as<int>();
		signalHigh = Json["signalHigh"].as<bool>();
		minDuration = Json["smallCrossTime"].as<int>();
		dropTime = Json["ignorSmallCrossTime"].as<int>();
		longCrossTime = Json["longCrossTime"].as<int>();
		LOG("Config readed")
	}

	mapFile.close();

	if (!SetupRelayGpio())
	{
		LOG("No relay gpio");
		throw -1;
	}

	fd = open("/dev/crossing_detector", O_RDONLY);

	if (fd < 0) 
	{
		LOG("No driver");
		throw fd;
	}

	memset(&my_poll, 0, sizeof(my_poll));
	my_poll.fd = fd;
	my_poll.events = POLLIN;
	LOG("Success installed reader")
}

bool CrossReader::SetupRelayGpio()
{
	if (SetupRelayGpioLibgpiod())
	{
		useLibgpiod = true;
		LOG("Relay init via libgpiod");
		return true;
	}

	if (SetupRelayGpioSysfs())
	{
		useLibgpiod = false;
		LOG("Relay init via sysfs");
		return true;
	}

	return false;
}

bool CrossReader::SetupRelayGpioLibgpiod()
{
	for (int chipIdx = 0; chipIdx < 32; ++chipIdx)
	{
		auto chipPath = std::string("/dev/gpiochip") + std::to_string(chipIdx);
		struct stat st {};
		if (stat(chipPath.c_str(), &st) != 0)
			continue;

		auto chip = gpiod_chip_open(chipPath.c_str());
		if (!chip)
			continue;

		auto line = gpiod_chip_get_line(chip, relePin);
		if (!line)
		{
			gpiod_chip_close(chip);
			continue;
		}

		int rc = gpiod_line_request_output(line, "inflight-crossfront", 0);
		if (rc == 0)
		{
			relayChip = chip;
			relayLine = line;
			return true;
		}

		gpiod_chip_close(chip);
	}

	return false;
}

bool CrossReader::SetupRelayGpioSysfs()
{
	int exportFile = open("/sys/class/gpio/export", O_WRONLY);
	if (exportFile < 0)
		return false;

	// On modern kernels sysfs GPIO numbers may be offset by gpiochip base.
	std::array<int, 3> candidates = { relePin, relePin + 512, relePin + 570 };
	for (auto candidate : candidates)
	{
		auto pin = std::to_string(candidate);
		write(exportFile, pin.c_str(), pin.size());

		auto directionPath = "/sys/class/gpio/gpio" + pin + "/direction";
		auto directionFile = open(directionPath.c_str(), O_WRONLY);
		if (directionFile >= 0)
		{
			write(directionFile, "out", 3);
			close(directionFile);
			sysfsGpioNumber = candidate;
			close(exportFile);
			return true;
		}
	}

	close(exportFile);
	return false;
}

void CrossReader::SetRelay(bool enabled)
{
	if (useLibgpiod && relayLine)
	{
		gpiod_line_set_value(relayLine, enabled ? 1 : 0);
		relayActive = enabled;
		return;
	}

	if (sysfsGpioNumber < 0)
		return;

	auto valuePath = "/sys/class/gpio/gpio" + std::to_string(sysfsGpioNumber) + "/value";
	auto af = open(valuePath.c_str(), O_WRONLY);
	if (af < 0)
		return;

	write(af, enabled ? "1" : "0", 1);
	close(af);
	relayActive = enabled;
}

void CrossReader::CleanupRelayGpio()
{
	if (relayLine)
	{
		gpiod_line_release(relayLine);
		relayLine = nullptr;
	}
	if (relayChip)
	{
		gpiod_chip_close(relayChip);
		relayChip = nullptr;
	}
}

void CrossReader::SingleRead()
{
	std::array<CrossingMeasure, 10> measures;
	read(fd, measures.data(), sizeof(measures));
	for (int i = 0; i < 10; ++i)
	{
		if (measures[i].index != oldMeasures[i].index)
		{
			unparsedMeasures.push_back(measures[i]);
			SLOG("MEASURE ADD " << measures[i].index << " ts: " << measures[i].ts << " state: " << measures[i].sensor_state)
		}
	}

	std::swap(oldMeasures, measures);
}

void CrossReader::ParseReadedMeasures()
{
	if (unparsedMeasures.empty()) return;

	std::sort(unparsedMeasures.begin(), unparsedMeasures.end(), [](CrossingMeasure& a, CrossingMeasure& b) { return a.index < b.index; });

	auto lr = unparsedMeasures.back().index;

	if (auto& firstUnparsed = unparsedMeasures.front(); lastReadIndex != 0 && lastReadIndex + 1 != firstUnparsed.index)
	{
		if (firstUnparsed.sensor_state == (signalHigh ? 'r' : 'f'))
			unparsedMeasures.erase(unparsedMeasures.begin());

		SLOG("LOST MEASURES " << (firstUnparsed.index - lastReadIndex) - 1)
	}
	else if (lastReadIndex == 0 && firstUnparsed.sensor_state == (signalHigh ? 'r' : 'f'))
	{
		crossings.push_back({ .startTs = firstUnparsed.ts,.endTs = firstUnparsed.ts });
	}

	for (auto& measure : unparsedMeasures)
	{
		if (measure.sensor_state == (signalHigh ? 'r' : 'f'))
		{
			if (crossings.empty())
			{
				crossings.push_back({ .startTs = measure.ts });
			}

			crossings.back().endTs = measure.ts;
		}
		else
		{
			crossings.push_back({ .startTs = measure.ts });
		}
	}

	bool allOk = false;
	auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
		std::chrono::system_clock::now().time_since_epoch()).count();
	if (now - firstTime < dropTime)
	{
		while (!allOk)
		{
			int passed = 0;
			for (int i = 0; i < crossings.size(); ++i)
			{
				auto& cross = crossings[i];
				auto duration = cross.Duration();
				if (!cross.Ready() && cross.startTs != crossings.back().startTs)
				{
					crossings.erase(crossings.begin() + i);
					continue;
				}
				if (cross.Ready() && duration < minDuration && cross.startTs < firstTime + dropTime)
				{
					crossings.erase(crossings.begin() + i);
					continue;
				}
				++passed;
			}
			allOk = passed == crossings.size();
		}
	}

	lastReadIndex = lr;

	unparsedMeasures.clear();

	if (auto lc = GetLastCrossing(); !sendFirst && lc.endTs != 0 && lc.startTs != lastSend.startTs && lc.startTs != firstTime)
	{
		Crossings::SendCrossing(lc, GetFirstCrossing().startTs);
		lastSend = lc;
	}

	bool canStart = sendFirst && !crossings.empty();

	if (canStart)
	{
		if (now - firstTime > dropTime)
			canStart = crossings.front().startTs != 0;
		else
			canStart = crossings.front().endTs != 0 && crossings.front().startTs != 0;
	}

	if (canStart)
	{
		firstTime = crossings.front().startTs;
		SLOG("Set first " << firstTime)
		if (future)
		{
			future->set_value(firstTime);
			future = nullptr;
		}
		sendFirst = false;
	}
}

void CrossReader::DebugTick()
{
	auto lc = GetLastCrossing();

	auto now = std::chrono::duration_cast<std::chrono::milliseconds>(
		std::chrono::system_clock::now().time_since_epoch()).count();

	if (lc.startTs == 0 || lc.endTs != 0)
		return;
}
