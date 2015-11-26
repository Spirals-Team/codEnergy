---
layout: default
title: Home
---

<h3>
  <span class="glyphicon glyphicon-bookmark glyphicon-align-left" aria-hidden="true"></span>&nbsp;&nbsp;Introduction
</h3>
---

This website gathers all dynamic charts created to analyze the software energy distribution.
Our analysis is possible by instrumenting the targeted program.
It works currently on the software compilable with the ```-finstrument-functions``` option.

Thanks to [d3.js](http://d3js.org/), we built dynamic and adaptive charts on top of javascript.

Two charts are created per software.
The first one, represented as a sunburst, allows to show the energy distribution through software's methods.
Each quarter represents a method and has its own color, excepts if the number of methods are too important (> 100). 
You can click on each of them to switch easily the context and thus to go deeper in the call graph.
The hatched quarters represent the intrinsic power consumption of the parent method.
The second one represents the context's power consumption through the time.
Each line in the chart is focusable, and allows to get the method's power profile.
The methods that consumes the most are scaled with green colors, blue colors otherwise.

<h3>
  <span class="glyphicon glyphicon-flash glyphicon-align-left" aria-hidden="true"></span>&nbsp;&nbsp;How it works?
</h3>
---

The charts are generated with JSON data which are put inside a specific folder (```_data```).
Each program available inside this folder has its own page ([example](http://spirals-team.github.io/codEnergy/charts/example)).

In order to generate the JSON file, you will have to use [PowerAPI](http://www.powerapi.org/).
PowerAPI is a middleware toolkit for building software-defined power meters.
Software-defined power meters are configurable software libraries that can estimate the power consumption of software in real-time.

<a href="https://github.com/Spirals-Team/codEnergy/blob/gh-pages/download/powerapi-code-energy-analysis-3.3.tgz?raw=true" target="_blank">A special version</a> was built for this purpose. 
Check out our [tutorial](tutorial/) for more details.

<h3>
  <span class="glyphicon glyphicon-gift glyphicon-align-left" aria-hidden="true"></span>&nbsp;&nbsp;Share your results with us!
</h3>
---
We will be happy to include your results inside our website :-)

To contribute, clone our [GitHub](https://github.com/Spirals-Team/codEnergy) repository.
Then, copy the JSON file generated by PowerAPI (```results/$PROGRAM/$PROGRAM.json```) inside the ```_data``` folder.
Our website is built on top of [Jekyll](https://jekyllrb.com/), thus you will be able to check out the charts at: http://127.0.0.1:4000/codEnergy/charts/```$PROGRAM``` by using ```jekyll serve``` in the root folder.

<br>