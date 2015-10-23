# codEnergy 

[![Build Status](https://travis-ci.org/Spirals-Team/codEnergy.svg?branch=master)](https://travis-ci.org/Spirals-Team/codEnergy)

Gather all information and charts about software energy distribution per function inside a website.

This website is built on top of [Jekyll](https://jekyllrb.com/).

## How to deploy in local?

```
gem install jekyll
git clone https://github.com/Spirals-Team/codEnergy.git; cd codEnergy; git checkout master
jekyll serve
```

## How to include a new software?

Check the [website](http://spirals-team.github.io/codEnergy/).

Once the analysis is performed, copy the corresponding json file into the ```_data``` folder and build again the website.
The chart is then available in local at: ```http://127.0.0.1:4000/codEnergy/charts/$PROGRAM```.

Please, don't forget to contribute and to create a pull-request with the generated json file, we would be happy to include it.
