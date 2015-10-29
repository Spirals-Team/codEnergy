module Jekyll

  class ChartPage < Page
    def initialize(site, base, dir, software)
      @site = site
      @base = base
      @dir = dir
      @name = 'index.html'

      self.process(@name)
      self.read_yaml(File.join(base, '_layouts'), 'software-energy-distribution.html')

      self.data['title'] = "#{software}"
      self.data['software'] = "#{software}"
    end
  end

  class ChartPageGenerator < Generator
    safe true

    def generate(site)
      if site.layouts.key? 'software-energy-distribution'
        dir = site.config['charts_dir'] || 'charts'
        site.data.each_key do |software|
          site.pages << ChartPage.new(site, site.source, File.join(dir, software), software)
        end
      end
    end
  end

end
