#define _GNU_SOURCE
#include <dlfcn.h>
#include <fcntl.h>
#include <stdbool.h>
#include <stdarg.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>

static int (*real_open)(const char *pathname, int flags, ...) = NULL;
static int (*real_openat)(int dirfd, const char *pathname, int flags, ...) = NULL;
static ssize_t (*real_write)(int fd, const void *buf, size_t count) = NULL;

static bool export_fd[4096];

static void init_real(void) {
    if (!real_open) real_open = dlsym(RTLD_NEXT, "open");
    if (!real_openat) real_openat = dlsym(RTLD_NEXT, "openat");
    if (!real_write) real_write = dlsym(RTLD_NEXT, "write");
}

static const char *remap_path(const char *in, char *out, size_t out_sz) {
    if (!in) return in;
    const char *needle = "/sys/class/gpio/gpio27/";
    const char *p = strstr(in, needle);
    if (!p) return in;

    size_t pre = (size_t)(p - in);
    const char *rep = "/sys/class/gpio/gpio539/";
    size_t rep_len = strlen(rep);
    size_t tail = strlen(p + strlen(needle));

    if (pre + rep_len + tail + 1 > out_sz) return in;
    memcpy(out, in, pre);
    memcpy(out + pre, rep, rep_len);
    memcpy(out + pre + rep_len, p + strlen(needle), tail);
    out[pre + rep_len + tail] = '\0';
    return out;
}

int open(const char *pathname, int flags, ...) {
    init_real();
    mode_t mode = 0;
    if (flags & O_CREAT) {
        va_list ap;
        va_start(ap, flags);
        mode = va_arg(ap, int);
        va_end(ap);
    }

    char remapped[512];
    const char *path = remap_path(pathname, remapped, sizeof(remapped));

    int fd = (flags & O_CREAT) ? real_open(path, flags, mode) : real_open(path, flags);
    if (fd >= 0 && fd < (int)(sizeof(export_fd) / sizeof(export_fd[0])) &&
        strcmp(path, "/sys/class/gpio/export") == 0) {
        export_fd[fd] = true;
    }
    return fd;
}

int openat(int dirfd, const char *pathname, int flags, ...) {
    init_real();
    mode_t mode = 0;
    if (flags & O_CREAT) {
        va_list ap;
        va_start(ap, flags);
        mode = va_arg(ap, int);
        va_end(ap);
    }

    char remapped[512];
    const char *path = remap_path(pathname, remapped, sizeof(remapped));

    int fd = (flags & O_CREAT) ? real_openat(dirfd, path, flags, mode) : real_openat(dirfd, path, flags);
    if (fd >= 0 && fd < (int)(sizeof(export_fd) / sizeof(export_fd[0])) &&
        strcmp(path, "/sys/class/gpio/export") == 0) {
        export_fd[fd] = true;
    }
    return fd;
}

ssize_t write(int fd, const void *buf, size_t count) {
    init_real();
    if (fd >= 0 && fd < (int)(sizeof(export_fd) / sizeof(export_fd[0])) && export_fd[fd]) {
        if (count > 0) {
            char tmp[64];
            size_t n = count < sizeof(tmp) - 1 ? count : sizeof(tmp) - 1;
            memcpy(tmp, buf, n);
            tmp[n] = '\0';
            if (strcmp(tmp, "27") == 0 || strcmp(tmp, "27\n") == 0) {
                const char *mapped = "539\n";
                return real_write(fd, mapped, strlen(mapped));
            }
        }
    }
    return real_write(fd, buf, count);
}
