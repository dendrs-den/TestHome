#include "Web/web.h"

int main()
{
	LOG("START")
	CrossReader::Get();
	drogon::app()
		.addListener("0.0.0.0", 15001)
		.setThreadNum(4)
		.run();

	return 0;
}
