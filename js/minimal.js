// 基础Three.js实现 - 添加太阳系行星
let scene, camera, renderer, controls;
let sun;
let planets = {};
let solarSystemGroup; // 添加太阳系容器组的引用

function init() {
    console.log("初始化最小化场景...");
    
    // 创建场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // 创建相机
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    // 进一步增加倾斜视角，并拉远距离
    camera.position.set(0, 30, 60);
    
    // 创建渲染器 - 添加抗锯齿和更好的像素比例
    renderer = new THREE.WebGLRenderer({
        antialias: true,  // 启用抗锯齿
        alpha: false      // 不需要透明背景
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // 适应高分辨率屏幕
    document.getElementById('container').appendChild(renderer.domElement);
    
    // 添加轨道控制器，并配置更好的默认设置
    if (typeof THREE.OrbitControls !== 'undefined') {
        controls = new THREE.OrbitControls(camera, renderer.domElement);
        
        // 启用阻尼效果，使控制更平滑
        controls.enableDamping = true; 
        controls.dampingFactor = 0.1;
        
        // 设置缩放限制
        controls.enableZoom = true;
        controls.minDistance = 15;  // 不能太靠近
        controls.maxDistance = 200; // 不能太远
        
        // 设置旋转限制，防止视角颠倒
        controls.maxPolarAngle = Math.PI * 0.85; // 限制俯仰角度
        
        // 设置平移限制
        controls.screenSpacePanning = true;
        
        // 初始目标点向上调整，使太阳系在屏幕中更居中
        controls.target.set(0, 20, 0);
        controls.update();
        
        console.log("轨道控制器已启用并配置");
    } else {
        console.warn("OrbitControls 不可用");
    }
    
    // 创建太阳系容器组，用于整体移动所有天体
    solarSystemGroup = new THREE.Group();
    // 将太阳系组整体上移，使其在屏幕中更居中
    solarSystemGroup.position.y = 25; // 增加Y轴位置值，使太阳系更向上移动
    scene.add(solarSystemGroup);
    
    // 创建太阳 - 使用发光材质和光晕
    const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
    
    // 太阳使用更亮的材质，不受光照影响
    const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00
    });
    
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    // 不再需要单独的Y轴偏移，因为整个组会被移动
    solarSystemGroup.add(sun);
    
    // 添加太阳光晕效果
    const sunGlow = createSunGlow(sun);
    
    // 添加光晕动画数据
    sun.userData.glow = sunGlow;
    sun.userData.glowPulse = 0;
    
    // 创建行星 - 添加轨道倾斜度
    createPlanet('mercury', 0.8, 8, 0x888888, 0.03);  // 水星 - 灰色
    createPlanet('venus', 1.2, 12, 0xe39e1c, 0.06);   // 金星 - 棕黄色
    createPlanet('earth', 1.5, 16, 0x2233ff, 0.00);   // 地球 - 蓝色
    createPlanet('mars', 1.0, 20, 0xff3300, 0.08);    // 火星 - 红色
    createPlanet('jupiter', 3.5, 28, 0xd8ca9d, 0.05); // 木星 - 米色
    createPlanet('saturn', 3.0, 36, 0xf0e2a1, 0.10);  // 土星 - 米黄色
    createPlanet('uranus', 2.5, 44, 0xa6fff8, 0.15);  // 天王星 - 青色
    createPlanet('neptune', 2.2, 52, 0x0000ff, 0.08); // 海王星 - 蓝色
    
    // 创建所有行星轨道，包括倾斜度和颜色
    Object.keys(planets).forEach(name => {
        const planet = planets[name];
        
        // 使用与行星相同的颜色（稍微淡一些）
        const orbitColor = new THREE.Color(planet.material.color.getHex()).multiplyScalar(0.7);
        
        createOrbit(planet.userData.distance, planet.userData.tilt, orbitColor);
    });
    
    // 添加土星环
    createSaturnRings(planets['saturn']);
    
    // 添加地球的月球
    createMoon(planets['earth']);
    
    // 添加小行星带在火星和木星之间
    createAsteroidBelt(24, 26, 50);
    
    // 创建简单星空背景
    createStars();
    
    // 添加增强的光照系统
    // 环境光 - 提供基础照明
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    // 点光源 - 从太阳位置发出
    const sunLight = new THREE.PointLight(0xffffff, 1.5, 300);
    sunLight.position.set(0, 0, 0); // 放在太阳位置
    solarSystemGroup.add(sunLight);
    
    // 方向光 - 提供全局方向性照明
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(100, 100, 100);
    directionalLight.lookAt(0, 0, 0);
    scene.add(directionalLight);
    
    // 窗口调整事件
    window.addEventListener('resize', onWindowResize);
    
    // 隐藏加载界面
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    // 添加点击事件以显示行星信息
    setupPlanetClickEvents();
    
    // 开始动画循环
    animate();
}

// 创建行星
function createPlanet(name, size, distance, color, tilt = 0) {
    // 创建几何体
    const geometry = new THREE.SphereGeometry(size, 32, 32);
    
    // 使用Lambert材质（响应光照）
    const material = new THREE.MeshLambertMaterial({
        color: color,
        // 添加微量自发光以确保行星在阴影中也能被看到
        emissive: new THREE.Color(color).multiplyScalar(0.1)
    });
    
    // 创建网格
    const planet = new THREE.Mesh(geometry, material);
    
    // 设置位置 - 在X轴设置距离
    planet.position.x = distance;
    // 不再需要单独的Y轴偏移，因为整个太阳系组会被移动
    
    // 添加元数据
    planet.userData = {
        name: name,
        distance: distance,
        // 行星轨道速度随距离增加而减小（模拟开普勒定律）
        orbitalSpeed: 0.005 / Math.sqrt(distance / 10),
        // 行星自转速度 - 根据行星大小加速自转
        rotationSpeed: 0.01 * (1 + size / 2),
        // 轨道倾斜度
        tilt: tilt
    };
    
    // 为特定行星添加简单的大气层效果
    if (name === 'earth') {
        // 地球蓝色大气层
        addAtmosphere(planet, size * 1.05, 0x3388ff, 0.2);
    } else if (name === 'venus') {
        // 金星厚重大气层
        addAtmosphere(planet, size * 1.08, 0xffe5bb, 0.4);
    }
    
    // 添加到太阳系组
    solarSystemGroup.add(planet);
    
    // 保存到行星集合中
    planets[name] = planet;
    
    return planet;
}

// 为行星添加大气层
function addAtmosphere(planet, radius, color, opacity) {
    // 创建略大于行星的球体作为大气层
    const atmosphereGeometry = new THREE.SphereGeometry(radius, 32, 32);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        side: THREE.BackSide // 从内部渲染，创造大气层效果
    });
    
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    planet.add(atmosphere); // 添加为行星的子对象，这样会跟随行星移动
    
    return atmosphere;
}

// 创建太阳光晕效果
function createSunGlow(sun) {
    if (!sun) return;
    
    // 创建多层发光光晕
    // 外层光晕 - 较大较淡
    const outerGlowGeometry = new THREE.SphereGeometry(6.5, 32, 32);
    const outerGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffddaa,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide // 从内部渲染，创建光晕效果
    });
    const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
    sun.add(outerGlow);
    
    // 中层光晕
    const middleGlowGeometry = new THREE.SphereGeometry(6, 32, 32);
    const middleGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffbb77,
        transparent: true,
        opacity: 0.4,
        side: THREE.BackSide
    });
    const middleGlow = new THREE.Mesh(middleGlowGeometry, middleGlowMaterial);
    sun.add(middleGlow);
    
    // 内层光晕 - 较小较亮
    const innerGlowGeometry = new THREE.SphereGeometry(5.5, 32, 32);
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa44,
        transparent: true,
        opacity: 0.5,
        side: THREE.BackSide
    });
    const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    sun.add(innerGlow);
    
    console.log("太阳光晕效果创建成功");
    
    return {
        outer: outerGlow,
        middle: middleGlow,
        inner: innerGlow
    };
}

// 创建土星环
function createSaturnRings(saturn) {
    if (!saturn) {
        console.warn("无法找到土星，跳过环的创建");
        return;
    }
    
    // 内外半径
    const innerRadius = 3.5;
    const outerRadius = 5.5;
    
    // 创建环几何体
    const ringsGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    
    // 创建环材质 - 半透明米黄色
    const ringsMaterial = new THREE.MeshBasicMaterial({
        color: 0xf8e8c0,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
    });
    
    // 创建环网格
    const rings = new THREE.Mesh(ringsGeometry, ringsMaterial);
    
    // 环需要旋转90度以水平展示
    rings.rotation.x = Math.PI / 2;
    
    // 添加到土星
    saturn.add(rings);
    
    console.log("土星环创建成功");
    return rings;
}



// 创建小行星带
function createAsteroidBelt(innerRadius, outerRadius, count) {
    const asteroids = [];
    
    // 创建多种小行星形状
    const asteroidGeometries = [
        new THREE.TetrahedronGeometry(0.2), // 四面体
        new THREE.IcosahedronGeometry(0.2), // 二十面体
        new THREE.BoxGeometry(0.2, 0.2, 0.2) // 立方体
    ];
    
    // 创建灰色小行星材质
    const asteroidMaterial = new THREE.MeshLambertMaterial({
        color: 0x888888,
        emissive: 0x222222
    });
    
    for (let i = 0; i < count; i++) {
        // 随机选择一种几何体
        const geometry = asteroidGeometries[Math.floor(Math.random() * asteroidGeometries.length)];
        
        // 创建小行星网格
        const asteroid = new THREE.Mesh(geometry, asteroidMaterial);
        
        // 随机位置（位于小行星带内）
        const radius = innerRadius + Math.random() * (outerRadius - innerRadius);
        const angle = Math.random() * Math.PI * 2;
        
        // 应用随机偏移，使小行星带不是完全平面的
        const height = (Math.random() - 0.5) * 2;
        
        // 设置位置
        asteroid.position.x = radius * Math.cos(angle);
        asteroid.position.y = height; // 只保留随机高度变化，不需要偏移量
        asteroid.position.z = radius * Math.sin(angle);
        
        // 随机旋转
        asteroid.rotation.x = Math.random() * Math.PI * 2;
        asteroid.rotation.y = Math.random() * Math.PI * 2;
        asteroid.rotation.z = Math.random() * Math.PI * 2;
        
        // 随机缩放
        const scale = 0.5 + Math.random() * 0.5;
        asteroid.scale.set(scale, scale, scale);
        
        // 添加到太阳系组
        solarSystemGroup.add(asteroid);
        asteroids.push(asteroid);
        
        // 添加动画数据
        asteroid.userData = {
            rotationSpeed: 0.005 + Math.random() * 0.01,
            orbitRadius: radius,
            orbitSpeed: 0.002 + Math.random() * 0.002,
            orbitAngle: angle
        };
    }
    
    console.log("小行星带创建成功：", count, "颗小行星");
    return asteroids;
}

// 创建月球
function createMoon(earth) {
    if (!earth) {
        console.warn("无法找到地球，跳过月球创建");
        return;
    }
    
    // 创建月球几何体和材质
    const moonGeometry = new THREE.SphereGeometry(0.4, 32, 32);
    const moonMaterial = new THREE.MeshLambertMaterial({
        color: 0xcccccc,   // 灰白色
        emissive: 0x222222 // 微弱自发光
    });
    
    // 创建月球网格
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    
    // 创建月球轨道系统 - 使用组来旋转
    const moonOrbit = new THREE.Group();
    earth.add(moonOrbit);
    
    // 将月球置于轨道中
    moon.position.x = 3;
    moonOrbit.add(moon);
    
    // 添加月球轨道线
    const orbitGeometry = new THREE.BufferGeometry();
    const vertices = [];
    
    const segments = 48;
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        vertices.push(
            3 * Math.cos(theta), 
            0, 
            3 * Math.sin(theta)
        );
    }
    
    orbitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    const orbitMaterial = new THREE.LineBasicMaterial({
        color: 0xaaaaaa,
        transparent: true,
        opacity: 0.3
    });
    
    const moonOrbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
    moonOrbit.add(moonOrbitLine);
    
    // 保存动画所需数据
    moonOrbit.userData = {
        isOrbit: true,
        rotationSpeed: 0.015
    };
    
    console.log("月球创建成功");
    return moonOrbit;
}

// 创建轨道
function createOrbit(radius, tilt = 0, color = 0xffffff) {
    const orbitGeometry = new THREE.BufferGeometry();
    const vertices = [];
    
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = radius * Math.cos(theta);
        
        // 应用轨道倾斜
        const y = radius * Math.sin(theta) * Math.sin(tilt);
        const z = radius * Math.sin(theta) * Math.cos(tilt);
        
        vertices.push(x, y, z);
    }
    
    orbitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    const orbitMaterial = new THREE.LineBasicMaterial({
        color: color,
        opacity: 0.5,
        transparent: true
    });
    
    const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
    // 不再需要Y轴偏移，因为整个太阳系组会被移动
    solarSystemGroup.add(orbit);
}

// 创建改进版星空背景
function createStars() {
    // 创建包含不同颜色恒星的背景
    const starsGeometry = new THREE.BufferGeometry();
    
    // 为点添加颜色属性
    const starsCount = 2000;
    const positions = new Float32Array(starsCount * 3);
    const colors = new Float32Array(starsCount * 3);
    const sizes = new Float32Array(starsCount);
    
    // 填充位置和颜色数组
    for (let i = 0; i < starsCount; i++) {
        // 使用球面分布，使星星更均匀
        const radius = 500 + Math.random() * 500; // 星星距离范围
        const theta = Math.random() * Math.PI * 2; // 水平角度
        const phi = Math.acos(2 * Math.random() - 1); // 垂直角度 - 均匀球面分布
        
        // 转换为笛卡尔坐标
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        // 根据恒星类型分配颜色
        const starType = Math.random();
        
        if (starType < 0.1) { // O/B型恒星 - 蓝色
            colors[i * 3] = 0.6 + Math.random() * 0.2;
            colors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
            colors[i * 3 + 2] = 1.0;
        } else if (starType < 0.2) { // A型恒星 - 蓝白色
            colors[i * 3] = 0.8 + Math.random() * 0.2;
            colors[i * 3 + 1] = 0.8 + Math.random() * 0.2;
            colors[i * 3 + 2] = 1.0;
        } else if (starType < 0.5) { // F/G型恒星 - 白/黄色
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 0.9 + Math.random() * 0.1;
            colors[i * 3 + 2] = 0.7 + Math.random() * 0.3;
        } else if (starType < 0.8) { // K型恒星 - 橙色
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 0.5 + Math.random() * 0.3;
            colors[i * 3 + 2] = 0.3 + Math.random() * 0.2;
        } else { // M型恒星 - 红色
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 0.2 + Math.random() * 0.3;
            colors[i * 3 + 2] = 0.2 + Math.random() * 0.2;
        }
        
        // 大多数恒星较小，少数较亮较大
        if (Math.random() < 0.1) {
            sizes[i] = 1.5 + Math.random() * 1.5; // 10%的大恒星
        } else {
            sizes[i] = 0.5 + Math.random() * 0.8; // 90%的小恒星
        }
    }
    
    // 设置属性
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // 创建材质
    const starsMaterial = new THREE.PointsMaterial({
        size: 1.0,
        vertexColors: true, // 使用顶点颜色
        transparent: true,
        opacity: 0.9
    });
    
    // 创建点云
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);
    
    console.log("创建改进版星空背景：", starsCount, "颗恒星");
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    
    // 更新轨道控制器
    if (controls) {
        controls.update();
    }
    
    // 旋转太阳并更新光晕
    if (sun.userData.currentRotation === undefined) {
        sun.userData.currentRotation = 0;
    }
    sun.userData.currentRotation += 0.005;
    sun.rotation.y = sun.userData.currentRotation;
    
    // 更新太阳光晕脉动
    if (sun.userData.glow) {
        sun.userData.glowPulse += 0.01;
        const pulse = 0.9 + 0.1 * Math.sin(sun.userData.glowPulse);
        
        // 应用脉动效果到光晕
        const glow = sun.userData.glow;
        if (glow.outer) {
            glow.outer.scale.set(pulse, pulse, pulse);
            glow.outer.material.opacity = 0.3 * pulse;
        }
        if (glow.middle) {
            glow.middle.scale.set(pulse * 0.95, pulse * 0.95, pulse * 0.95);
            glow.middle.material.opacity = 0.4 * pulse;
        }
        if (glow.inner) {
            glow.inner.scale.set(pulse * 0.9, pulse * 0.9, pulse * 0.9);
            glow.inner.material.opacity = 0.5 * pulse;
        }
    }
    
    // 更新所有行星
    const now = Date.now() * 0.001;
    
    // 遍历所有行星更新位置和自转
    Object.keys(planets).forEach(name => {
        const planet = planets[name];
        const distance = planet.userData.distance;
        const speed = planet.userData.orbitalSpeed;
        
        // 公转 - 绕太阳旋转，包含轨道倾斜
        const angle = now * speed;
        const tilt = planet.userData.tilt;
        
        // 应用倾斜的轨道运动
        planet.position.x = distance * Math.cos(angle);
        planet.position.y = distance * Math.sin(angle) * Math.sin(tilt); // 不需要额外的Y轴偏移
        planet.position.z = distance * Math.sin(angle) * Math.cos(tilt);
        
        // 存储每个行星的旋转角度，避免位置更新时重置
        if (planet.userData.currentRotation === undefined) {
            planet.userData.currentRotation = 0;
        }
        // 累加旋转角度
        planet.userData.currentRotation += planet.userData.rotationSpeed * 0.1;
        // 应用旋转
        planet.rotation.y = planet.userData.currentRotation;
        
        // 更新卫星和环
        planet.children.forEach(child => {
            // 更新月球轨道
            if (child.userData && child.userData.isOrbit) {
                child.rotation.y += child.userData.rotationSpeed;
            }
            
            // 根据需要更新其它子对象
        });
    });
    
    // 更新小行星
    scene.children.forEach(object => {
        // 检查是否为小行星
        if (object.userData && object.userData.orbitRadius !== undefined) {
            // 更新自转
            object.rotation.x += object.userData.rotationSpeed;
            object.rotation.y += object.userData.rotationSpeed;
            
            // 更新公转
            object.userData.orbitAngle += object.userData.orbitSpeed;
            const angle = object.userData.orbitAngle;
            const radius = object.userData.orbitRadius;
            
            // 计算新位置
            object.position.x = radius * Math.cos(angle);
            // 使用保存的高度值，而不是每帧随机生成新高度，不需要额外的Y轴偏移
            if (object.userData.height === undefined) {
                object.userData.height = (Math.random() - 0.5) * 2;
            }
            object.position.y = object.userData.height;
            object.position.z = radius * Math.sin(angle);
        }
    });
    
    // 不再需要更新行星标签
    
    // 渲染场景
    renderer.render(scene, camera);
    
    // 检测是否成功渲染
    if (!window._renderedOnce) {
        window._renderedOnce = true;
        console.log("Three.js渲染成功");
        
        // 更新状态指示
        const renderStatus = document.getElementById('render-status');
        if (renderStatus) {
            renderStatus.innerHTML = '<span style="color:green">渲染成功</span>';
        }
        
        // 创建一个成功指示标记
        const successIndicator = document.createElement('div');
        successIndicator.style.position = 'fixed';
        successIndicator.style.bottom = '10px';
        successIndicator.style.left = '10px';
        successIndicator.style.width = '20px';
        successIndicator.style.height = '20px';
        successIndicator.style.borderRadius = '50%';
        successIndicator.style.backgroundColor = 'green';
        successIndicator.style.border = '2px solid white';
        successIndicator.style.zIndex = '1000';
        successIndicator.id = 'success-indicator';
        document.body.appendChild(successIndicator);
    }
}

// 设置行星点击事件
function setupPlanetClickEvents() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // 添加点击事件监听器
    window.addEventListener('click', function(event) {
        // 计算鼠标位置的归一化设备坐标 (-1 到 +1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // 更新射线
        raycaster.setFromCamera(mouse, camera);
        
        // 获取所有与射线相交的对象
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        // 处理点击
        if (intersects.length > 0) {
            const object = intersects[0].object;
            let planetName = '';
            
            // 寻找行星名称，可能是直接点击的行星或其子对象
            if (object === sun) {
                planetName = 'sun';
            } else if (object.parent && planets[object.parent.userData.name]) {
                planetName = object.parent.userData.name;
            } else if (planets[object.userData.name]) {
                planetName = object.userData.name;
            } else {
                // 检查是否点击的是月球
                let parent = object.parent;
                while (parent) {
                    if (parent.parent && planets[parent.parent.userData.name]) {
                        planetName = parent.parent.userData.name + 'Moon';
                        break;
                    }
                    parent = parent.parent;
                }
            }
            
            // 显示行星信息
            if (planetName) {
                showPlanetInfo(planetName);
            }
        }
    });
}

// 显示行星信息
function showPlanetInfo(planetName) {
    // 行星信息
    const planetInfo = {
        'sun': {
            name: '太阳',
            description: '太阳系的中心恒星，一颗G型主序星。',
            diameter: '1,392,700 km',
            rotation: '25.05 天',
            info: '太阳占据了太阳系总质量的99.86%，主要由氢（约73%）和氦（约25%）组成。'
        },
        'mercury': {
            name: '水星',
            description: '太阳系中最小的行星，也是最接近太阳的行星。',
            distance: '5770万 km',
            diameter: '4,879 km',
            info: '水星几乎没有大气层，表面满是陨石坑。'
        },
        'venus': {
            name: '金星',
            description: '太阳系中第二颗行星，有时被称为地球的"姊妹星"。',
            distance: '1.082亿 km',
            diameter: '12,104 km',
            info: '金星被厚厚的二氧化碳大气层包围，导致温室效应，表面温度高达465°C。'
        },
        'earth': {
            name: '地球',
            description: '太阳系中第三颗行星，是目前已知唯一孕育生命的天体。',
            distance: '1.496亿 km',
            diameter: '12,742 km',
            info: '地球表面有大约71%的面积被水覆盖，有一颗较大的卫星：月球。'
        },
        'earthMoon': {
            name: '月球',
            description: '地球的唯一天然卫星。',
            distance: '地球平均384,400 km',
            diameter: '3,474 km',
            info: '月球是唯一人类已经踏足的地外天体。'
        },
        'mars': {
            name: '火星',
            description: '太阳系中第四颗行星，被称为"红色星球"。',
            distance: '2.279亿 km',
            diameter: '6,779 km',
            info: '火星表面的铁氧化物使其呈现红色，有证据表明火星上曾经有液态水。'
        },
        'jupiter': {
            name: '木星',
            description: '太阳系中最大的行星，一颗气态巨行星。',
            distance: '7.785亿 km',
            diameter: '139,820 km',
            info: '木星主要由氢和氦组成，有一个著名的大红斑（一个巨大的风暴）。'
        },
        'saturn': {
            name: '土星',
            description: '太阳系中第二大行星，以其壮观的环系闻名。',
            distance: '14.34亿 km',
            diameter: '116,460 km',
            info: '土星的环系主要由冰粒和岩石碎片组成。'
        },
        'uranus': {
            name: '天王星',
            description: '太阳系中第七颗行星，一颗冰巨行星。',
            distance: '28.71亿 km',
            diameter: '50,724 km',
            info: '天王星是唯一一个"侧卧"旋转的行星，其自转轴几乎与轨道平面平行。'
        },
        'neptune': {
            name: '海王星',
            description: '太阳系中最远的行星，也是另一颗冰巨行星。',
            distance: '44.95亿 km',
            diameter: '49,244 km',
            info: '海王星是太阳系中风速最高的行星，最高风速可达2,100 km/h。'
        }
    };
    
    // 获取所选行星的信息
    const info = planetInfo[planetName];
    if (!info) return;
    
    // 更新信息面板
    const infoPanel = document.getElementById('planet-info');
    if (!infoPanel) return;
    
    // 构建HTML内容
    let html = `<h3>${info.name}</h3>`;
    html += `<p>${info.description}</p>`;
    
    if (info.distance) {
        html += `<p>距太阳：${info.distance}</p>`;
    }
    
    if (info.diameter) {
        html += `<p>直径：${info.diameter}</p>`;
    }
    
    if (info.rotation) {
        html += `<p>自转周期：${info.rotation}</p>`;
    }
    
    html += `<p>${info.info}</p>`;
    
    // 更新面板内容
    infoPanel.innerHTML = html;
    
    // 聚焦相机到选中的行星
    focusCameraOnPlanet(planetName);
}

// 聚焦相机到选中的行星
function focusCameraOnPlanet(planetName) {
    if (!controls) return;
    
    let target;
    if (planetName === 'sun') {
        target = sun;
    } else if (planetName === 'earthMoon') {
        // 月球是地球的子对象
        target = planets['earth'];
    } else {
        target = planets[planetName];
    }
    
    if (!target) return;
    
    // 移动相机到行星附近
    const position = target.position.clone();
    const distance = target === sun ? 20 : (target.userData.distance || 5);
    
    // 设置轨道控制器目标点
    controls.target.copy(position);
    
    // 更新控制器
    controls.update();
}


// 窗口调整
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 初始化
window.addEventListener('load', init);