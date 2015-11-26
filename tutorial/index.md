---
layout: default
title: Tutorial
---

<h3>
  <span class="glyphicon glyphicon-pushpin glyphicon-align-left" aria-hidden="true"></span>&nbsp;&nbsp;Example
</h3>
---
The code below (```trace.c```) will be linked to the targeted program in order to instrument it and get runtime information.

{% highlight c linenos %}

#include <stdio.h>
#include <unistd.h>
#include <sys/types.h>
#include <time.h>
#include <sys/syscall.h>
#include <stdlib.h>

static FILE *trace;
static int is_init = 0;

void create_trace() {
  char filename[256];
  snprintf(filename, sizeof(filename), "trace_%d.txt", getpid());
  trace = fopen(filename, "w");
  is_init = 1;
}

long long current_timestamp() {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC_RAW, &ts);
  return ts.tv_sec * 1000000000LL + ts.tv_nsec;
}

long gettid() {
  return syscall(SYS_gettid);
}

void __cyg_profile_func_enter (void *func,  void *caller) {
  if(is_init == 0) create_trace();
  fprintf(trace, "%ld;;e;;%p;;%lld\n", gettid(), func, current_timestamp());
}

void __cyg_profile_func_exit (void *func, void *caller) {
  fprintf(trace, "%ld;;x;;%lld\n", gettid(), current_timestamp());
}

{% endhighlight %}

We will use here this program (```example.c```), with 2 additional threads, classic and recursive calls.

{% highlight c linenos %}

#include <stdlib.h>
#include <math.h>
#include <time.h>
#include <stdio.h>
#include <pthread.h>
#include <string.h>

void c() {
  time_t beg, end;
  beg = time(NULL);
  end = time(NULL);

  while(end - beg < 2) {
    sqrt(rand());
    end = time(NULL);
  }
}

void b() {
  time_t beg, end;
  beg = time(NULL);
  end = time(NULL);

  while(end - beg < 4) {
    sqrt(rand());
    end = time(NULL);
  }

  c();
}

void a() {
  int i = 0;
  while(i < 100000000) {
    sqrt(rand());
    i++;
  }

  b();
}

void d(int call) {
  time_t beg, end;
  beg = time(NULL);
  end = time(NULL);

  if(call == 0) {
     b();
  }

  else {
    while(end - beg < 10) {
      printf("loop\n");
      end = time(NULL);
    }

    d(call - 1);
  }
}

void *thread_work() {
  a();
  b();
  c();
}

int main() {
  pthread_t tid[2];
  int i = 0;
  int err;

  while(i < 2) {
    err = pthread_create(&(tid[i]), NULL, &thread_work, NULL);
    if(err != 0) {
      printf("can't create thread :[%s]", strerror(err));
    }
    else printf("Thread created successfully\n");

   i++;
  }

  a();
  b();
  b();
  c();
  a();
  d(5);
  return 0;
}

{% endhighlight %}

Now, compile the program without forgetting to link the targeted program with the task program.

{% highlight console %}

cc -c -Wall -O0 trace.c -o trace.o
cc -finstrument-functions -c example.c; cc -o example example.o trace.o -lm -lpthread

{% endhighlight %}

This executable can now be used with the PowerAPI executable [<a href="{{ "/download/powerapi-code-energy-analysis-3.3.tgz" | prepend: site.baseurl }}" target="_blank">DOWNLOAD</a>].

Once downloaded, unzip the archive, and edit ```conf/code-energy-analysis.conf```.
Some of parameters are required, and are built with PowerAPI (i.e., powerapi-sampling).
For more details, check out the [documentation](https://github.com/Spirals-Team/powerapi/wiki).

The new parameters to define here have to be:

{% highlight yaml linenos %}

powerapi.code-energy-analysis.workloads = [
  { name = "example", binary-path = "/home/powerapi/example", script = "scripts/start-example.bash" }
]

{% endhighlight %}

Then, create a file ```scripts/start-example.bash``` and add:

{% highlight bash linenos %}

#!/bin/bash

# This line is required. Don't edit.
cd results/$1

# Edit with the correct binary path (should be the same as the one written inside the configuration file)
/home/powerapi/example

exit 0

{% endhighlight %}

You can now launch the PowerAPI executable by executing:

{% highlight console %}

sudo ./bin/powerapi-code-energy-analysis

{% endhighlight %}

Once PowerAPI has finished, a field should be generated (```results/$PROGRAM/$PROGRAM.json```).
Put this file inside the ```_data``` folder.

A page corresponding to the energy distribution of your program should be generated and available at this address: ```http://127.0.0.1/codEnergy/charts/$PROGRAM/```.

<br>
