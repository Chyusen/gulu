(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();

  // --- Chart 1: 图像生成API价格对比 ---
  var chartPrice = echarts.init(document.getElementById('chart-price'), null, { renderer: 'svg' });
  chartPrice.setOption({
    animation: false,
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      appendToBody: true,
      formatter: function(params) {
        var p = params[0];
        return p.name + '<br/>单价: ' + p.value + ' 元/张';
      }
    },
    grid: { left: '8%', right: '8%', bottom: '15%', top: '10%' },
    xAxis: {
      type: 'category',
      data: ['Kolors', 'Z-Image-Turbo', 'ERNIE-Image-Turbo', 'Z-Image', 'Qwen-Image'],
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted, fontSize: 11, rotate: 15 }
    },
    yAxis: {
      type: 'value',
      name: '单价 (元/张)',
      nameTextStyle: { color: muted, fontSize: 11 },
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted, fontSize: 11 },
      splitLine: { lineStyle: { color: rule, type: 'dashed' } }
    },
    series: [{
      type: 'bar',
      data: [
        { value: 0, itemStyle: { color: accent2 } },
        { value: 0.10, itemStyle: { color: accent } },
        { value: 0.11, itemStyle: { color: accent } },
        { value: 0.30, itemStyle: { color: '#d4a373' } },
        { value: 0.30, itemStyle: { color: '#d4a373' } }
      ],
      barWidth: '50%',
      label: {
        show: true,
        position: 'top',
        color: ink,
        fontSize: 12,
        fontWeight: 600,
        formatter: function(params) {
          return params.value === 0 ? '免费' : '¥' + params.value.toFixed(2);
        }
      },
      markLine: {
        silent: true,
        symbol: 'none',
        lineStyle: { color: accent, type: 'dashed', width: 2 },
        data: [{ yAxis: 0.20, label: { formatter: '预算上限 ¥0.20', color: accent, fontSize: 11 } }]
      }
    }]
  });
  window.addEventListener('resize', function() { chartPrice.resize(); });

  // --- Chart 2: 开发路线图甘特图 ---
  var chartGantt = echarts.init(document.getElementById('chart-gantt'), null, { renderer: 'svg' });
  var categories = ['小红书攻略推荐', '高德地图集成', 'AI生成形象'];
  var days = ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7',
              'Day 8', 'Day 9', 'Day 10', 'Day 11', 'Day 12', 'Day 13', 'Day 14',
              'Day 15', 'Day 16', 'Day 17', 'Day 18', 'Day 19', 'Day 20', 'Day 21'];

  chartGantt.setOption({
    animation: false,
    tooltip: {
      formatter: function(params) {
        return params.data.name + '<br/>周期: Day ' + (params.data.value[0] + 1) + ' - Day ' + (params.data.value[1] + 1);
      },
      appendToBody: true
    },
    grid: { left: '15%', right: '5%', bottom: '12%', top: '8%' },
    xAxis: {
      type: 'category',
      data: days,
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: muted, fontSize: 10, interval: 2 }
    },
    yAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: rule } },
      axisLabel: { color: ink, fontSize: 12, fontWeight: 600 }
    },
    series: [{
      type: 'custom',
      renderItem: function(params, api) {
        var categoryIndex = api.value(2);
        var start = api.coord([api.value(0), categoryIndex]);
        var end = api.coord([api.value(1), categoryIndex]);
        var height = api.size([0, 1])[1] * 0.5;
        return {
          type: 'rect',
          shape: {
            x: start[0],
            y: start[1] - height / 2,
            width: end[0] - start[0],
            height: height
          },
          style: {
            fill: api.value(3),
            stroke: bg2,
            lineWidth: 2,
            shadowColor: 'rgba(0,0,0,0.1)',
            shadowBlur: 4,
            shadowOffsetY: 2
          }
        };
      },
      encode: { x: [0, 1], y: 2 },
      data: [
        // AI生成形象: Day 1-5 (index 0-4)
        { name: 'AI生成形象', value: [0, 4, 2, accent], itemStyle: { color: accent } },
        // 高德地图集成: Day 6-12 (index 5-11)
        { name: '高德地图集成', value: [5, 11, 1, accent2], itemStyle: { color: accent2 } },
        // 小红书攻略推荐: Day 13-21 (index 12-20)
        { name: '小红书攻略推荐', value: [12, 20, 0, '#d4a373'], itemStyle: { color: '#d4a373' } }
      ]
    }]
  });
  window.addEventListener('resize', function() { chartGantt.resize(); });

})();
