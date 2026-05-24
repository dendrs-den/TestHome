#pragma once
#include <vector>
#include <deque>
#include <thread>
#include <future>

#include <poll.h>
#include <array>

class CrossReader
{
public:
    struct Crossing
    {
        unsigned long long startTs = 0;
        unsigned long long endTs = 0;

        int Duration()
        {
            if (startTs == 0 || endTs == 0)
                return -1;

            return endTs - startTs;
        }
        bool Ready()
        {
            return startTs != 0 && endTs != 0;
        }
    };

    struct CrossingMeasure
    {
        unsigned long long index = 0;
        unsigned long long ts = 0;
        char sensor_state = '\0';
    };

    static void Reset() { Get().ResetStaticProp(); }
    static unsigned long long StartRead() { return Get().StartReadStaticProp(); }
    static void StopRead() { Get().StopReadStaticProp(); }
    static Crossing GetFirstCrossing() { return Get().GetFirstCrossingStaticProp(); }
    static Crossing GetLastCrossing() { return Get().GetLastCrossingStaticProp(); }

    static CrossReader& Get();
private:
    void ResetStaticProp();
    unsigned long long StartReadStaticProp();
    void StopReadStaticProp();
    Crossing GetFirstCrossingStaticProp();
    Crossing GetLastCrossingStaticProp();

    CrossReader();
    void SingleRead();
    void ParseReadedMeasures();

    std::thread readThread;
    std::thread debugThread;
    bool work = false;

    bool sendFirst = false;
    bool run = false;
    CrossReader::Crossing lastSend = {};

    std::vector<CrossReader::Crossing> crossings = {};
    std::array<CrossingMeasure, 10> oldMeasures = {};
    std::deque<CrossingMeasure> unparsedMeasures = {};
    unsigned long long lastReadIndex = 0;
    unsigned long long firstTime = 0;
    
    int minDuration = 30;
    int dropTime = 2000;

    int fd = -1;
    struct pollfd my_poll;

    int relePin = 27;
    bool signalHigh = false;
    int longCrossTime = 5000;
    std::promise<unsigned long long>* future;

    bool relayActive = false;
    int sysfsGpioNumber = -1;

    bool SetupRelayGpio();
    bool SetupRelayGpioSysfs();
    void SetRelay(bool enabled);
    
    void DebugTick();
};
