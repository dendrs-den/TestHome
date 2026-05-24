#pragma once

#include <thread>
#include <string>
#include <chrono>
#include <queue>
#include <mutex>
#include <fstream>
#include <sstream>
#include <iostream>
#include <iomanip>
#include <filesystem>
#include <unordered_map>
#include <algorithm>

#include <stdint.h>
#include <stddef.h>
#include <semaphore.h>
#include <time.h>
#include <fcntl.h>
#include <sys/stat.h>


#define PP_CAT(a, b) PP_CAT_I(a, b)
#define PP_CAT_I(a, b) PP_CAT_II(~, a ## b)
#define PP_CAT_II(p, res) res

#define UNIQUE_NAME(base) PP_CAT(base, __COUNTER__)

#define LOG(c) auto UNIQUE_NAME(log) = LogSystem::Logging::get().log(c);
#define SLOG(c) std::cout << c << std::endl;

#define ENDLOG 0
#define DEBUGPRNT 1

class Semaphore
{
public:
	Semaphore(bool shared = false)
	{
		if (sem_init(&sm, (int)shared, 0) == -1)
#if defined(__cpp_exceptions) || defined(_CPPUNWIND)
			throw;
#else
			;
#endif
	}
	~Semaphore() = default;
	void Wait()
	{
		sem_wait(&sm);
	}
	int TimedWait(size_t milliseconds)
	{
		struct timespec ts;
		if (clock_gettime(CLOCK_REALTIME, &ts) == -1)
			return 1;
		ts.tv_nsec += 1000000ull * milliseconds;
		return sem_timedwait(&sm, &ts);
	}
	void Post() 
	{
		sem_post(&sm);
	}
	unsigned long Count()
	{
		int val = 0;
		sem_getvalue(&sm, &val);
		return val;
	}
private:

	sem_t sm;
};

namespace LogSystem
{
	class Logging
	{
	private:
		class Log
		{
		private:
			std::string log;
		public:
			Log(std::string log) : log(log) { LogSystem::Logging::get().write(log); }
#if defined(ENDLOG) && ENDLOG
			~Log() { LogSystem::Logging::get().write(log + " - OK"); }
#endif
		};
		const std::string logNameBase = "cross_log_";
		std::string logName = logNameBase + ".txt";
		std::filesystem::path logPath;
		std::mutex mutex;
		std::thread logThread;
		std::queue<std::string> logs;
		Semaphore sem;
		std::fstream file;

	public:
		static Logging& get()
		{
			static Logging inst;

			return inst;
		}

		Logging()
		{
			logPath = std::filesystem::current_path() += "/logs";
			std::cout << std::filesystem::create_directory(logPath) << std::endl;;
			struct FileTime
			{
				std::string path;
				timespec time;
			};
			std::deque<FileTime> files;
			for (const auto& entry : std::filesystem::directory_iterator(logPath))
			{
				struct stat statbuf;
				lstat(entry.path().c_str(), &statbuf);
				
				files.push_back({ .path = entry.path(), .time = statbuf.st_mtim });
			}
			std::sort(files.begin(), files.end(), [](FileTime& a, FileTime& b) { return a.time.tv_sec < b.time.tv_sec; });

			while (files.size() > 5)
			{
				auto ft = files.front();
				files.erase(files.begin());
				remove(ft.path.c_str());
			}

			updateLogName();
			logThread = std::thread([&]()
				{
					while (true)
					{
						sem.Wait();
						std::lock_guard lock(mutex);
						if (!file.is_open())
							file.open(logName, std::ios::out);
						file << logs.front() << std::endl;
						logs.pop();
						file.flush();
					}
				});
		}

		Log log(std::ostream& stream)
		{
			std::stringstream ss;
			ss << stream.rdbuf();
			return log(ss);
		}

		Log log(const char* c)
		{
			return Log(c);
		}

		Log log(std::string string)
		{
			return log(string.c_str());
		}

		Log log(std::stringstream& ss)
		{
			return log(ss.str());
		}

		void updateLogName()
		{
			std::lock_guard lock(mutex);
			std::stringstream ss;
			ss << logPath.c_str() << std::filesystem::path::preferred_separator << logNameBase << time() << ".txt";
			logName = ss.str();
			file.close();
		}

		std::string time()
		{
			auto tt = std::chrono::system_clock::to_time_t(std::chrono::system_clock::now());
			std::tm tm = *std::gmtime(&tt);

			std::stringstream ss;
			ss << std::put_time(&tm, "%Z-%Y:%m:%d-%H:%M:%S");
			return ss.str();
		}

		void write(std::string l)
		{
			std::lock_guard lock(mutex);
			std::stringstream ss;

			ss << time() << " (" << std::this_thread::get_id() << "): " << l;
			logs.push(ss.str());
			sem.Post();

#if defined(DEBUGPRNT) && DEBUGPRNT
			std::cout << ss.str() << std::endl;
#endif
		}
	};
}