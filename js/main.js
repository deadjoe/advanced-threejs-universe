// Three.js 太阳系模拟 - 升级版 2023-03-08
let scene, camera, renderer, controls;
let planets = {};
let asteroids = [];
let clock;

// 初始化函数
function init() {
    try {
        console.log("初始化太阳系场景...");
        
        // 立即移除加载界面
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // 创建时钟对象用于动画
        clock = new THREE.Clock();
        
        // 创建场景
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        
        // 创建相机
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 30, 90);
        
        // 创建渲染器
        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.shadowMap.enabled = true;
        
        const container = document.getElementById('container');
        if (container) {
            container.innerHTML = ''; // 清空容器
            container.appendChild(renderer.domElement);
        } else {
            document.body.appendChild(renderer.domElement);
        }
        
        // 添加轨道控制器
        if (typeof THREE.OrbitControls !== 'undefined') {
            controls = new THREE.OrbitControls(camera, renderer.domElement);
            controls.enableDamping = true;
            controls.dampingFactor = 0.05;
            controls.minDistance = 20;
            controls.maxDistance = 300;
        }
        
        // 添加环境光
        const ambientLight = new THREE.AmbientLight(0x333333);
        scene.add(ambientLight);
        
        // 创建太阳系
        createSolarSystem();
        
        // 创建背景星星
        createStars(1000);
        
        // 添加窗口调整事件
        window.addEventListener('resize', onWindowResize);
        
        // 修改信息面板内容
        const infoPanel = document.getElementById('planet-info');
        if (infoPanel) {
            infoPanel.innerHTML = "点击行星查看详情";
        }
        
        console.log("初始化完成，开始动画循环");
        
        // 开始动画循环
        animate();
    } catch (e) {
        console.error("初始化时出错:", e);
        alert("初始化THREE.js场景时出错，请查看控制台");
    }
}

// 创建太阳系
function createSolarSystem() {
    // 太阳
    const sunGeometry = new THREE.SphereGeometry(8, 32, 32);
    
    // 使用更复杂的材质使太阳发光
    const sunMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,
        transparent: true,
        opacity: 1
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
    planets.sun = sun;
    
    // 添加太阳光晕
    createSunGlow(sun);
    
    // 添加太阳光源
    const sunLight = new THREE.PointLight(0xffffff, 1.5, 1000);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
    
    // 创建行星
    createPlanet('mercury', 0.8, 12, 0, 0x888888);
    createPlanet('venus', 1.2, 16, 0, 0xe39e1c);
    createPlanet('earth', 1.5, 22, 0.1, 0x2233ff);
    createPlanet('mars', 1, 28, 0.05, 0xff3300);
    createPlanet('jupiter', 4, 40, 0.05, 0xd8ca9d);
    createPlanet('saturn', 3.5, 55, 0.1, 0xf0e2a1);
    createPlanet('uranus', 2.5, 70, 0.1, 0xa6fff8);
    createPlanet('neptune', 2.3, 85, 0.1, 0x0000ff);
    
    // 创建行星轨道
    createOrbits();
    
    // 创建小行星带（在火星和木星之间）
    createAsteroidBelt(100, 32, 37);
    
    // 延迟创建土星环和地球卫星，确保行星对象已经创建
    setTimeout(() => {
        if (planets.earth) {
            createMoon(planets.earth, 0.4, 2.2, 0.02, 0xcccccc);
        }
        if (planets.saturn) {
            createSaturnRings(planets.saturn);
        }
    }, 100);
    
    // 创建一些星云
    createNebula(new THREE.Vector3(-150, 30, -200), 0x8a2be2, 40); // 紫色星云
    createNebula(new THREE.Vector3(200, -50, -250), 0x4169e1, 50);  // 蓝色星云
    createNebula(new THREE.Vector3(-100, -80, -180), 0xff6347, 35); // 橙红色星云
}

// 创建单个行星
function createPlanet(name, size, distance, tilt, color) {
    const planetGeometry = new THREE.SphereGeometry(size, 32, 32);
    const planetMaterial = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.1,
        roughness: 0.8
    });
    
    const planet = new THREE.Mesh(planetGeometry, planetMaterial);
    
    // 设置行星数据
    planet.userData = {
        name: name,
        distance: distance,
        orbitalSpeed: 0.02 / Math.sqrt(distance), // 根据距离调整速度
        rotationSpeed: 0.01,
        tilt: tilt
    };
    
    // 设置位置和倾斜角度
    planet.position.x = distance;
    planet.rotation.x = tilt;
    
    // 启用阴影
    planet.castShadow = true;
    planet.receiveShadow = true;
    
    scene.add(planet);
    planets[name] = planet;
    
    return planet;
}

// 创建地球卫星（月球）
function createMoon(parent, size, distance, orbitalSpeed, color) {
    const moonGeometry = new THREE.SphereGeometry(size, 16, 16);
    const moonMaterial = new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.1,
        roughness: 0.8
    });
    
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    
    // 创建卫星系统（用Group包装便于旋转）
    const moonSystem = new THREE.Group();
    moonSystem.add(moon);
    moon.position.x = distance;
    
    // 设置卫星数据
    moon.userData = {
        name: `${parent.userData.name}-moon`,
        orbitalSpeed: orbitalSpeed,
        rotationSpeed: 0.005
    };
    
    // 启用阴影
    moon.castShadow = true;
    moon.receiveShadow = true;
    
    parent.add(moonSystem);
    return moonSystem;
}

// 创建土星环
function createSaturnRings(saturn) {
    const innerRadius = 4;
    const outerRadius = 7;
    const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffefd5,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
    });
    
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    
    saturn.add(ring);
    return ring;
}

// 创建小行星带
function createAsteroidBelt(count, minRadius, maxRadius) {
    // 清除之前的小行星
    for (let i = asteroids.length - 1; i >= 0; i--) {
        scene.remove(asteroids[i]);
    }
    asteroids = [];
    
    // 几种不同的小行星几何体
    const geometries = [
        new THREE.TetrahedronGeometry(0.2),  // 四面体
        new THREE.IcosahedronGeometry(0.2),  // 二十面体
        new THREE.DodecahedronGeometry(0.2)  // 十二面体
    ];
    
    // 几种不同的小行星颜色
    const colors = [
        0x8B8989, // 灰棕色
        0x9F9F9F, // 中灰色
        0xA8A8A8  // 浅灰色
    ];
    
    for (let i = 0; i < count; i++) {
        // 随机选择几何体和颜色
        const geometry = geometries[Math.floor(Math.random() * geometries.length)];
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        const material = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.8,
            metalness: 0.1
        });
        
        const asteroid = new THREE.Mesh(geometry, material);
        
        // 随机位置
        const radius = minRadius + Math.random() * (maxRadius - minRadius);
        const angle = Math.random() * Math.PI * 2;
        const height = (Math.random() - 0.5) * 2; // 高度变化，使带子更立体
        
        asteroid.position.x = Math.cos(angle) * radius;
        asteroid.position.z = Math.sin(angle) * radius;
        asteroid.position.y = height;
        
        // 随机缩放
        const scale = 0.5 + Math.random() * 0.5;
        asteroid.scale.set(scale, scale, scale);
        
        // 随机旋转
        asteroid.rotation.x = Math.random() * Math.PI * 2;
        asteroid.rotation.y = Math.random() * Math.PI * 2;
        asteroid.rotation.z = Math.random() * Math.PI * 2;
        
        // 设置动画数据
        asteroid.userData = {
            orbitRadius: radius,
            orbitAngle: angle,
            orbitSpeed: 0.02 / Math.sqrt(radius), // 轨道速度
            rotationSpeed: 0.01 + Math.random() * 0.05 // 自转速度
        };
        
        scene.add(asteroid);
        asteroids.push(asteroid);
    }
}

// 创建行星轨道
function createOrbits() {
    Object.keys(planets).forEach(name => {
        if (name !== 'sun') {
            const planet = planets[name];
            const orbitGeometry = new THREE.RingGeometry(
                planet.userData.distance - 0.1,
                planet.userData.distance + 0.1,
                128
            );
            
            const orbitMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffff,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.1
            });
            
            const orbit = new THREE.Mesh(orbitGeometry, orbitMaterial);
            orbit.rotation.x = Math.PI / 2;
            scene.add(orbit);
        }
    });
}

// 创建太阳光晕效果
function createSunGlow(sun) {
    // 创建外层光晕
    const glowGeometry = new THREE.SphereGeometry(10, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffddaa,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide
    });
    const outerGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    sun.add(outerGlow);
    
    // 创建内层光晕
    const innerGlowGeometry = new THREE.SphereGeometry(9, 32, 32);
    const innerGlowMaterial = new THREE.MeshBasicMaterial({
        color: 0xffaa33,
        transparent: true,
        opacity: 0.5,
        side: THREE.BackSide
    });
    const innerGlow = new THREE.Mesh(innerGlowGeometry, innerGlowMaterial);
    sun.add(innerGlow);
    
    // 添加动画效果
    sun.userData.glow = {
        outer: outerGlow,
        inner: innerGlow,
        pulseFactor: 0,
        pulseSpeed: 0.005
    };
    
    return sun;
}

// 创建星云（使用粒子系统）
function createNebula(position, color, size) {
    const particleCount = 500;
    const geometry = new THREE.BufferGeometry();
    
    // 创建随机分布的粒子
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    const baseColor = new THREE.Color(color);
    
    for (let i = 0; i < particleCount; i++) {
        // 创建云状分布
        const radius = size * Math.random();
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        
        // 转换为笛卡尔坐标
        const x = position.x + radius * Math.sin(phi) * Math.cos(theta);
        const y = position.y + radius * Math.sin(phi) * Math.sin(theta);
        const z = position.z + radius * Math.cos(phi);
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        // 添加一些颜色变化
        const colorVariation = Math.random() * 0.2;
        colors[i * 3] = baseColor.r * (1 - colorVariation);
        colors[i * 3 + 1] = baseColor.g * (1 - colorVariation);
        colors[i * 3 + 2] = baseColor.b * (1 - colorVariation);
        
        // 添加大小变化
        sizes[i] = 1 + Math.random() * 2;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // 创建粒子材质
    const material = new THREE.PointsMaterial({
        size: 1.5,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending
    });
    
    const nebula = new THREE.Points(geometry, material);
    
    // 添加一些动画数据
    nebula.userData = {
        rotationSpeed: (Math.random() - 0.5) * 0.0001,
        pulseSpeed: 0.001,
        pulsePhase: Math.random() * Math.PI * 2,
        isNebula: true // 标记为星云，与背景星星区分
    };
    
    scene.add(nebula);
    return nebula;
}

// 创建背景星星
function createStars(count) {
    const starsGeometry = new THREE.BufferGeometry();
    
    // 使用顶点颜色增加星星的多样性
    const starsMaterial = new THREE.PointsMaterial({
        size: 1.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });
    
    const starsVertices = [];
    const starsColors = [];
    
    for (let i = 0; i < count; i++) {
        // 位置
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starsVertices.push(x, y, z);
        
        // 颜色 - 添加一些蓝色、黄色和白色恒星
        const colorChoice = Math.random();
        if (colorChoice < 0.2) {
            // 蓝白色恒星
            starsColors.push(0.8, 0.9, 1.0);
        } else if (colorChoice < 0.4) {
            // 黄色恒星
            starsColors.push(1.0, 0.9, 0.6);
        } else if (colorChoice < 0.5) {
            // 橙红色恒星
            starsColors.push(1.0, 0.7, 0.5);
        } else {
            // 白色恒星
            starsColors.push(1.0, 1.0, 1.0);
        }
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starsColors, 3));
    
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);
    
    return starField;
}

// 更新天体位置和动画
function updateScene(delta) {
    // 更新太阳发光效果
    if (planets.sun && planets.sun.userData.glow) {
        const glow = planets.sun.userData.glow;
        
        // 脉动效果
        glow.pulseFactor += glow.pulseSpeed * delta;
        const pulse = 0.7 + 0.3 * Math.sin(glow.pulseFactor);
        
        // 更新内外光晕大小和不透明度
        if (glow.outer && glow.inner) {
            glow.outer.scale.set(pulse, pulse, pulse);
            glow.inner.scale.set(pulse * 0.95, pulse * 0.95, pulse * 0.95);
            
            glow.outer.material.opacity = 0.3 * pulse;
            glow.inner.material.opacity = 0.5 * pulse;
        }
        
        // 太阳自转
        planets.sun.rotation.y += 0.003 * delta;
    }
    
    // 更新行星位置
    Object.keys(planets).forEach(name => {
        if (name !== 'sun') {
            const planet = planets[name];
            
            // 公转
            if (planet.userData.orbitalSpeed) {
                const angle = planet.userData.orbitalSpeed * delta;
                const x = planet.position.x;
                const z = planet.position.z;
                
                planet.position.x = x * Math.cos(angle) - z * Math.sin(angle);
                planet.position.z = x * Math.sin(angle) + z * Math.cos(angle);
            }
            
            // 自转
            if (planet.userData.rotationSpeed) {
                planet.rotation.y += planet.userData.rotationSpeed * delta;
            }
            
            // 更新卫星位置
            planet.children.forEach(child => {
                if (child instanceof THREE.Group) {
                    child.rotation.y += 0.02 * delta;
                }
            });
        }
    });
    
    // 更新小行星
    asteroids.forEach(asteroid => {
        if (asteroid.userData.orbitSpeed) {
            // 更新轨道位置
            asteroid.userData.orbitAngle += asteroid.userData.orbitSpeed * delta;
            const radius = asteroid.userData.orbitRadius;
            
            asteroid.position.x = Math.cos(asteroid.userData.orbitAngle) * radius;
            asteroid.position.z = Math.sin(asteroid.userData.orbitAngle) * radius;
            
            // 自转
            asteroid.rotation.x += asteroid.userData.rotationSpeed * delta * 0.2;
            asteroid.rotation.y += asteroid.userData.rotationSpeed * delta;
            asteroid.rotation.z += asteroid.userData.rotationSpeed * delta * 0.3;
        }
    });
    
    // 更新星云
    scene.children.forEach(child => {
        if (child instanceof THREE.Points && child.userData.rotationSpeed) {
            // 缓慢旋转
            child.rotation.y += child.userData.rotationSpeed * delta;
            
            // 如果有脉动效果
            if (child.userData.pulseSpeed) {
                child.userData.pulsePhase += child.userData.pulseSpeed * delta;
                const pulse = 0.8 + 0.2 * Math.sin(child.userData.pulsePhase);
                
                // 可选：通过缩放模拟脉动效果
                child.scale.set(pulse, pulse, pulse);
            }
        }
    });
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    
    try {
        const delta = clock ? clock.getDelta() * 10 : 0.1;
        
        // 更新控制器
        if (controls) {
            controls.update();
        }
        
        // 更新场景中所有动画元素
        updateScene(delta);
        
        // 渲染场景
        renderer.render(scene, camera);
    } catch (e) {
        console.error("动画循环中出错:", e);
    }
}

// 处理窗口大小改变
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 添加射线投射和点击交互
function initInteractions() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // 鼠标点击事件
    window.addEventListener('click', function(event) {
        // 计算鼠标在归一化设备坐标中的位置 (-1 到 +1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // 从相机发射一条射线
        raycaster.setFromCamera(mouse, camera);
        
        // 获取射线和所有行星的交点
        const planetObjects = Object.values(planets);
        const intersects = raycaster.intersectObjects(planetObjects);
        
        if (intersects.length > 0) {
            // 获取第一个交点的对象
            const planetObject = intersects[0].object;
            showPlanetInfo(planetObject);
        }
    });
    
    // 控制面板交互
    setupControls();
}

// 显示行星信息
function showPlanetInfo(planetObject) {
    if (!planetObject || !planetObject.userData || !planetObject.userData.name) {
        return;
    }
    
    const planetName = planetObject.userData.name;
    const infoPanel = document.getElementById('planet-info');
    
    if (!infoPanel) return;
    
    const planetNames = {
        sun: "太阳",
        mercury: "水星",
        venus: "金星",
        earth: "地球",
        mars: "火星",
        jupiter: "木星",
        saturn: "土星",
        uranus: "天王星",
        neptune: "海王星",
        blackhole: "黑洞"
    };
    
    const displayName = planetNames[planetName] || planetName;
    
    let html = `<h3>${displayName}</h3>`;
    
    if (planetName === 'sun') {
        html += `<p>太阳系的中心恒星</p>`;
    } else if (planetName === 'blackhole') {
        html += `<p>一个巨大的黑洞，极端的引力使得光线无法逃逸</p>`;
        html += `<p>周围环绕着由被撕裂的恒星物质组成的吸积盘</p>`;
    } else {
        const distance = planetObject.userData.distance;
        const orbitalSpeed = planetObject.userData.orbitalSpeed;
        const rotationSpeed = planetObject.userData.rotationSpeed;
        
        html += `<p>距太阳: ${distance} 单位</p>`;
        html += `<p>公转速度: ${(orbitalSpeed * 1000).toFixed(2)}</p>`;
        html += `<p>自转速度: ${(rotationSpeed * 1000).toFixed(2)}</p>`;
    }
    
    infoPanel.innerHTML = html;
}

// 创建黑洞
function createBlackHole() {
    // 移除已有黑洞
    if (planets.blackhole) {
        scene.remove(planets.blackhole);
        delete planets.blackhole;
    }
    
    // 黑洞位置
    const position = new THREE.Vector3(-150, 10, -200);
    
    // 黑洞事件视界
    const blackholeGeometry = new THREE.SphereGeometry(5, 32, 32);
    const blackholeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x000000,
        transparent: true,
        opacity: 1.0
    });
    
    const blackhole = new THREE.Mesh(blackholeGeometry, blackholeMaterial);
    blackhole.position.copy(position);
    
    // 黑洞数据
    blackhole.userData = {
        name: "blackhole",
        rotationSpeed: 0.01
    };
    
    // 创建吸积盘
    const accretionDiskGeometry = new THREE.RingGeometry(7, 15, 64, 8);
    const accretionDiskMaterial = new THREE.MeshBasicMaterial({
        color: 0xff4500,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
    });
    
    const accretionDisk = new THREE.Mesh(accretionDiskGeometry, accretionDiskMaterial);
    accretionDisk.rotation.x = Math.PI / 2;
    blackhole.add(accretionDisk);
    
    // 添加光晕
    const glowGeometry = new THREE.SphereGeometry(6, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide
    });
    
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    blackhole.add(glow);
    
    scene.add(blackhole);
    planets.blackhole = blackhole;
    
    return blackhole;
}

// 设置控制面板交互
function setupControls() {
    const autoRotateToggle = document.getElementById('auto-rotate-toggle');
    const resetCamera = document.getElementById('reset-camera');
    const presetSolar = document.getElementById('preset-solar');
    const presetNebula = document.getElementById('preset-nebula');
    const presetBlackhole = document.getElementById('preset-blackhole');
    const starsCount = document.getElementById('stars-count');
    const lightIntensity = document.getElementById('light-intensity');
    
    // 自动旋转切换
    if (autoRotateToggle) {
        autoRotateToggle.addEventListener('click', function() {
            if (controls) {
                controls.autoRotate = !controls.autoRotate;
                this.textContent = `自动旋转: ${controls.autoRotate ? '开' : '关'}`;
            }
        });
    }
    
    // 重置相机
    if (resetCamera) {
        resetCamera.addEventListener('click', function() {
            if (camera) {
                camera.position.set(0, 30, 90);
                camera.lookAt(0, 0, 0);
                if (controls) {
                    controls.target.set(0, 0, 0);
                    controls.update();
                }
            }
        });
    }
    
    // 太阳系预设
    if (presetSolar) {
        presetSolar.addEventListener('click', function() {
            // 太阳系视角
            camera.position.set(0, 30, 90);
            if (controls) {
                controls.target.set(0, 0, 0);
                controls.update();
            }
        });
    }
    
    // 星云预设
    if (presetNebula) {
        presetNebula.addEventListener('click', function() {
            // 寻找第一个星云
            let nebulaPos = new THREE.Vector3(-150, 30, -200);
            
            // 移动到星云位置
            camera.position.set(
                nebulaPos.x + 20,
                nebulaPos.y + 10,
                nebulaPos.z + 60
            );
            
            if (controls) {
                controls.target.set(nebulaPos.x, nebulaPos.y, nebulaPos.z);
                controls.update();
            }
        });
    }
    
    // 黑洞预设
    if (presetBlackhole) {
        presetBlackhole.addEventListener('click', function() {
            // 如果黑洞不存在，则创建
            if (!planets.blackhole) {
                createBlackHole();
            }
            
            // 移动到黑洞位置
            if (planets.blackhole) {
                const pos = planets.blackhole.position;
                
                camera.position.set(
                    pos.x,
                    pos.y + 5,
                    pos.z + 30
                );
                
                if (controls) {
                    controls.target.set(pos.x, pos.y, pos.z);
                    controls.update();
                }
            }
        });
    }
    
    // 星星数量控制
    if (starsCount) {
        starsCount.addEventListener('input', function() {
            const count = parseInt(this.value);
            if (document.getElementById('stars-count-value')) {
                document.getElementById('stars-count-value').textContent = count;
            }
            
            // 重新创建星星
            scene.children.forEach(child => {
                if (child instanceof THREE.Points && !(child.userData && child.userData.isNebula)) {
                    scene.remove(child);
                }
            });
            
            createStars(count);
        });
    }
    
    // 光照强度控制
    if (lightIntensity) {
        lightIntensity.addEventListener('input', function() {
            const intensity = parseFloat(this.value);
            if (document.getElementById('light-intensity-value')) {
                document.getElementById('light-intensity-value').textContent = intensity.toFixed(1);
            }
            
            // 更新光照
            scene.children.forEach(child => {
                if (child instanceof THREE.PointLight) {
                    child.intensity = intensity * 1.5;
                }
            });
        });
    }
}

// 初始化交互
window.addEventListener('load', function() {
    init();
    
    // 延迟初始化交互，确保场景已经加载
    setTimeout(initInteractions, 500);
});