cmake_minimum_required (VERSION 3.8)

project(jsm.crossing-detector-front)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_FLAGS "${CMAKE_C_FLAGS} -lpthread")

find_package(Drogon REQUIRED)
find_library(GPIOD_LIB gpiod REQUIRED)

file(GLOB_RECURSE sources "*.cpp" "*.hpp")

add_executable(jsm.crossing-detector-front ${sources})

target_link_libraries(jsm.crossing-detector-front Drogon::Drogon ${GPIOD_LIB})

install(TARGETS jsm.crossing-detector-front DESTINATION /home/pi/build)
