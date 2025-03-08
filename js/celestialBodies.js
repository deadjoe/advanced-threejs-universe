/**
 * 天体数据
 */
const celestialData = {
    sun: {
        name: "太阳",
        description: "太阳系的中心天体，一颗G型主序星。",
        diameter: 1392700, // 公里
        rotationPeriod: 25.05, // 日
        surfaceTemp: 5778, // 开尔文
        info: "太阳占据了太阳系总质量的99.86%，主要由氢（约73%）和氦（约25%）组成。太阳通过核聚变发出光和热，为地球上的生命提供能量。"
    },
    mercury: {
        name: "水星",
        description: "太阳系中最小的行星，也是最接近太阳的行星。",
        diameter: 4879, // 公里
        distanceFromSun: 57.9, // 百万公里
        orbitalPeriod: 88, // 日
        rotationPeriod: 58.65, // 日
        info: "水星没有大气层，表面满是陨石坑，温度变化极大，从白天的430°C到夜晚的-180°C。"
    },
    venus: {
        name: "金星",
        description: "太阳系中第二颗行星，也被称为'晨星'或'昏星'。",
        diameter: 12104, // 公里
        distanceFromSun: 108.2, // 百万公里
        orbitalPeriod: 225, // 日
        rotationPeriod: -243, // 日（负数表示逆向自转）
        info: "金星被厚厚的二氧化碳大气层包围，导致强烈的温室效应，表面温度高达465°C，是太阳系中最热的行星。"
    },
    earth: {
        name: "地球",
        description: "太阳系中第三颗行星，是目前已知唯一孕育生命的天体。",
        diameter: 12742, // 公里
        distanceFromSun: 149.6, // 百万公里
        orbitalPeriod: 365.25, // 日
        rotationPeriod: 1, // 日
        info: "地球的大气层、液态水和磁场为生命提供了适宜的环境。地球有一颗相对较大的卫星：月球。"
    },
    mars: {
        name: "火星",
        description: "太阳系中第四颗行星，被称为'红色星球'。",
        diameter: 6779, // 公里
        distanceFromSun: 227.9, // 百万公里
        orbitalPeriod: 687, // 日
        rotationPeriod: 1.03, // 日
        info: "火星表面有许多特征，包括奥林匹斯山（太阳系最大的火山）和瓦利斯·马利纳利峡谷。有证据表明，火星上曾经有液态水。"
    },
    jupiter: {
        name: "木星",
        description: "太阳系中最大的行星，一颗气态巨行星。",
        diameter: 139820, // 公里
        distanceFromSun: 778.5, // 百万公里
        orbitalPeriod: 4333, // 日
        rotationPeriod: 0.41, // 日
        info: "木星主要由氢和氦组成，有一个著名的大红斑（一个巨大的风暴），拥有79颗已知的卫星。"
    },
    saturn: {
        name: "土星",
        description: "太阳系中第二大行星，以其美丽的环系闻名。",
        diameter: 116460, // 公里
        distanceFromSun: 1434, // 百万公里
        orbitalPeriod: 10759, // 日
        rotationPeriod: 0.45, // 日
        info: "土星的环系主要由冰粒和岩石碎片组成，直径达282000公里，但厚度只有数百米。土星有82颗已知的卫星。"
    },
    uranus: {
        name: "天王星",
        description: "太阳系中第七颗行星，一颗冰巨行星。",
        diameter: 50724, // 公里
        distanceFromSun: 2871, // 百万公里
        orbitalPeriod: 30687, // 日
        rotationPeriod: -0.72, // 日（负数表示逆向自转）
        info: "天王星是唯一一个'侧卧'旋转的行星，其自转轴几乎与轨道平面平行。它有27颗已知的卫星。"
    },
    neptune: {
        name: "海王星",
        description: "太阳系中最远的行星，也是另一颗冰巨行星。",
        diameter: 49244, // 公里
        distanceFromSun: 4495, // 百万公里
        orbitalPeriod: 60190, // 日
        rotationPeriod: 0.67, // 日
        info: "海王星是太阳系中风速最高的行星，最高风速可达2100公里/小时。它有14颗已知的卫星，最大的是海卫一。"
    },
    blackhole: {
        name: "黑洞",
        description: "一个理论上的天体模型，具有极强的引力，连光都无法逃脱。",
        info: "黑洞周围有一个事件视界，一旦越过这个边界，就不可能再返回。黑洞中心被认为存在奇点，那里的密度和引力趋于无限大。黑洞周围的吸积盘是由被引力吸引的物质形成的，这些物质在坠入黑洞前会发出强烈的电磁辐射。"
    }
};

/**
 * 获取天体信息
 */
function getCelestialInfo(name) {
    return celestialData[name] || null;
}

/**
 * 更新天体信息面板
 */
function updateInfoPanel(name) {
    const info = getCelestialInfo(name);
    const panel = document.getElementById('planet-info');
    
    if (!info) {
        panel.innerHTML = "选择一个天体查看详细信息";
        return;
    }
    
    let html = `<h3>${info.name}</h3>`;
    html += `<p class="description">${info.description}</p>`;
    
    if (info.diameter) {
        html += `<p>直径: ${info.diameter.toLocaleString()} 公里</p>`;
    }
    
    if (info.distanceFromSun) {
        html += `<p>距太阳: ${info.distanceFromSun.toLocaleString()} 百万公里</p>`;
    }
    
    if (info.orbitalPeriod) {
        html += `<p>公转周期: ${info.orbitalPeriod.toLocaleString()} 地球日</p>`;
    }
    
    if (info.rotationPeriod) {
        const rotationAbs = Math.abs(info.rotationPeriod);
        const direction = info.rotationPeriod < 0 ? '逆向' : '顺向';
        html += `<p>自转周期: ${rotationAbs.toLocaleString()} 地球日 (${direction})</p>`;
    }
    
    if (info.surfaceTemp) {
        html += `<p>表面温度: ${info.surfaceTemp.toLocaleString()} K</p>`;
    }
    
    html += `<p class="info">${info.info}</p>`;
    
    panel.innerHTML = html;
}