// 改进版的太阳系场景 - 从简单版本逐步过渡
let scene, camera, renderer, controls;
let planets = {};
let clock;
let timeScale = 1.0;
let isPaused = false;

// 初始化函数
function init() {
    console.log("初始化改进版太阳系场景...");
    
    // 更新渲染状态
    updateRenderStatus('初始化中');
    
    // 创建时钟对象用于动画
    clock = new THREE.Clock();
    
    // 创建场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // 创建相机
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 40, 100);
    
    // 创建渲染器 - 使用基础设置
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // 设置输出编码
    if (THREE.sRGBEncoding !== undefined) {
        renderer.outputEncoding = THREE.sRGBEncoding;
        console.log("设置outputEncoding = sRGBEncoding");
    }
    
    // 添加到DOM
    const container = document.getElementById('container');
    if (container) {
        container.innerHTML = '';
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
    const ambientLight = new THREE.AmbientLight(0x555555);
    scene.add(ambientLight);
    
    // 创建太阳系
    createSolarSystem();
    
    // 创建背景星星
    createStars(3000);
    
    // 窗口调整事件
    window.addEventListener('resize', onWindowResize);
    
    // 隐藏加载界面
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    // 添加基础界面互动
    setupBasicControls();
    
    // 开始动画循环
    animate();
    
    console.log("初始化完成，场景包含", scene.children.length, "个对象");
}

// 创建太阳系
function createSolarSystem() {
    console.log("开始创建太阳系...");
    
    // 创建太阳
    const sunGeometry = new THREE.SphereGeometry(8, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,
        emissive: 0xffff00,
    });
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
    planets.sun = sun;
    
    // 添加太阳光源
    const sunLight = new THREE.PointLight(0xffffff, 2.0, 500);
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
    
    // 创建地球的卫星
    setTimeout(() => {
        if (planets.earth) {
            createMoon(planets.earth, 0.4, 2.0, 0.02, 0xcccccc);
        }
        
        if (planets.saturn) {
            createSaturnRings(planets.saturn);
        }
    }, 100);
}

// 创建单个行星
function createPlanet(name, size, distance, tilt, color) {
    try {
        // 创建行星组
        const planetGroup = new THREE.Group();
        
        // 创建行星几何体
        const planetGeometry = new THREE.SphereGeometry(size, 32, 32);
        
        // 尝试使用MeshLambertMaterial，如果支持的话
        let planetMaterial;
        try {
            planetMaterial = new THREE.MeshLambertMaterial({
                color: color,
                emissive: new THREE.Color(color).multiplyScalar(0.1) // 轻微自发光，使黑暗处可见
            });
        } catch (e) {
            console.warn(`高级材质创建失败，回退到基础材质: ${e.message}`);
            planetMaterial = new THREE.MeshBasicMaterial({
                color: color
            });
        }
        
        // 创建网格并添加到组
        const planet = new THREE.Mesh(planetGeometry, planetMaterial);
        planetGroup.add(planet);
        
        // 为特定行星添加大气层
        try {
            if (name === 'earth') {
                // 地球大气层 - 蓝色半透明
                addAtmosphere(planet, size * 1.05, new THREE.Color(0x3388ff), 0.3);
            } else if (name === 'venus') {
                // 金星厚重大气层 - 橙黄色
                addAtmosphere(planet, size * 1.1, new THREE.Color(0xffcc44), 0.5);
            } else if (name === 'jupiter' || name === 'saturn') {
                // 气态巨行星云层效果 - 轻微放大的半透明球体
                addAtmosphere(planet, size * 1.02, new THREE.Color(color).multiplyScalar(1.2), 0.2);
            }
        } catch (e) {
            console.warn(`行星 ${name} 大气层添加失败: ${e.message}`);
        }
        
        // 设置数据
        planetGroup.userData = {
            name: name,
            distance: distance,
            orbitalSpeed: 0.02 / Math.sqrt(distance), // 根据距离调整速度
            rotationSpeed: 0.01,
            tilt: tilt
        };
        
        // 设置位置
        planetGroup.position.x = distance;
        planetGroup.rotation.x = tilt;
        
        // 添加到场景
        scene.add(planetGroup);
        planets[name] = planetGroup;
        
        return planetGroup;
    } catch (e) {
        console.error(`创建行星 ${name} 时出错:`, e);
        
        // 创建一个备用的简单行星
        const backupGeometry = new THREE.SphereGeometry(size, 16, 16);
        const backupMaterial = new THREE.MeshBasicMaterial({ color: color });
        const backupPlanet = new THREE.Mesh(backupGeometry, backupMaterial);
        
        backupPlanet.userData = {
            name: name,
            distance: distance,
            orbitalSpeed: 0.02 / Math.sqrt(distance),
            rotationSpeed: 0.01,
            tilt: tilt
        };
        
        backupPlanet.position.x = distance;
        backupPlanet.rotation.x = tilt;
        
        scene.add(backupPlanet);
        planets[name] = backupPlanet;
        
        return backupPlanet;
    }
}

// 添加行星大气层
function addAtmosphere(planet, size, color, opacity) {
    const atmosphereGeometry = new THREE.SphereGeometry(size, 32, 32);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        side: THREE.BackSide
    });
    
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    planet.parent.add(atmosphere);
    
    return atmosphere;
}

// 创建轨道
function createOrbits() {
    Object.keys(planets).forEach(name => {
        if (name !== 'sun') {
            const planet = planets[name];
            const distance = planet.userData.distance;
            
            // 创建轨道线
            const orbitGeometry = new THREE.BufferGeometry();
            const vertices = [];
            
            // 生成轨道点
            const segments = 128;
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const x = distance * Math.cos(angle);
                const z = distance * Math.sin(angle);
                vertices.push(x, 0, z);
            }
            
            // 设置几何体顶点
            orbitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            
            // 创建轨道材质
            let orbitColor;
            switch (name) {
                case 'mercury': orbitColor = 0xAAAAAA; break;
                case 'venus': orbitColor = 0xFFD700; break;
                case 'earth': orbitColor = 0x00BFFF; break;
                case 'mars': orbitColor = 0xFF4500; break;
                case 'jupiter': orbitColor = 0xFF8C00; break;
                case 'saturn': orbitColor = 0xFFFF00; break;
                case 'uranus': orbitColor = 0x00FFFF; break;
                case 'neptune': orbitColor = 0x0000FF; break;
                default: orbitColor = 0xFFFFFF;
            }
            
            const orbitMaterial = new THREE.LineBasicMaterial({
                color: orbitColor,
                transparent: true,
                opacity: 0.5
            });
            
            const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
            scene.add(orbit);
            planet.userData.orbit = orbit;
        }
    });
}

// 创建地球卫星（月球）
function createMoon(parent, size, distance, orbitalSpeed, color) {
    const moonGeometry = new THREE.SphereGeometry(size, 16, 16);
    const moonMaterial = new THREE.MeshBasicMaterial({
        color: color
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    
    // 创建卫星系统
    const moonSystem = new THREE.Group();
    moonSystem.add(moon);
    moon.position.x = distance;
    
    // 设置数据
    moon.userData = {
        name: `${parent.userData.name}-moon`,
        orbitalSpeed: orbitalSpeed,
        rotationSpeed: 0.005
    };
    
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

// 创建背景星星 - 改进版有不同颜色的星星
function createStars(count) {
    try {
        const starsGeometry = new THREE.BufferGeometry();
        
        // 位置数组
        const positions = new Float32Array(count * 3);
        // 颜色数组
        const colors = new Float32Array(count * 3);
        // 大小数组
        const sizes = new Float32Array(count);
        
        // 创建随机星星
        for (let i = 0; i < count; i++) {
            // 随机位置 - 球面分布
            const radius = 300 + Math.random() * 700; // 距离
            const theta = Math.random() * Math.PI * 2; // 水平角度
            const phi = Math.acos(2 * Math.random() - 1); // 垂直角度
            
            // 球面坐标转笛卡尔坐标
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);  // x
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);  // y
            positions[i * 3 + 2] = radius * Math.cos(phi);  // z
            
            // 随机星星颜色
            const colorChoice = Math.random();
            if (colorChoice < 0.2) {
                // 蓝色恒星（较热）
                colors[i * 3] = 0.7;
                colors[i * 3 + 1] = 0.8;
                colors[i * 3 + 2] = 1.0;
            } else if (colorChoice < 0.4) {
                // 白色恒星
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 1.0;
                colors[i * 3 + 2] = 1.0;
            } else if (colorChoice < 0.7) {
                // 黄色恒星
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 1.0;
                colors[i * 3 + 2] = 0.8;
            } else {
                // 红色恒星（较冷）
                colors[i * 3] = 1.0;
                colors[i * 3 + 1] = 0.6;
                colors[i * 3 + 2] = 0.5;
            }
            
            // 随机大小，大多数星星较小
            sizes[i] = Math.random() < 0.95 ? 0.5 + Math.random() * 0.5 : 1.0 + Math.random() * 1.0;
        }
        
        // 添加属性
        starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        starsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        // 创建材质
        const starsMaterial = new THREE.PointsMaterial({
            size: 1.0,
            vertexColors: true,
            transparent: true,
            opacity: 0.9
        });
        
        // 创建点云
        const starField = new THREE.Points(starsGeometry, starsMaterial);
        starField.userData = { isStarField: true };
        scene.add(starField);
        
        console.log("创建星空背景成功 - 星星数量:", count);
        return starField;
    } catch (e) {
        console.error("创建高级星空失败:", e);
        
        // 回退到基本星空
        return createSimpleStars(count);
    }
}

// 创建简单的星空背景 - 备用方案
function createSimpleStars(count) {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1.0,
        transparent: true,
        opacity: 0.8
    });
    
    const starsVertices = [];
    
    for (let i = 0; i < count; i++) {
        // 位置
        const x = (Math.random() - 0.5) * 1000;
        const y = (Math.random() - 0.5) * 1000;
        const z = (Math.random() - 0.5) * 1000;
        starsVertices.push(x, y, z);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);
    
    console.log("创建简单星空背景成功 - 星星数量:", count);
    return starField;
}
}

// 更新场景
function updateScene(delta) {
    if (isPaused) return;
    
    const scaledDelta = delta * timeScale;
    
    // 更新太阳自转
    if (planets.sun) {
        planets.sun.rotation.y += 0.003 * scaledDelta;
    }
    
    // 更新行星位置
    Object.keys(planets).forEach(name => {
        if (name !== 'sun') {
            const planet = planets[name];
            
            // 行星公转
            if (planet.userData.orbitalSpeed) {
                const angle = planet.userData.orbitalSpeed * scaledDelta;
                const x = planet.position.x;
                const z = planet.position.z;
                
                planet.position.x = x * Math.cos(angle) - z * Math.sin(angle);
                planet.position.z = x * Math.sin(angle) + z * Math.cos(angle);
            }
            
            // 行星自转
            planet.children.forEach(child => {
                if (child instanceof THREE.Mesh) {
                    child.rotation.y += 0.01 * scaledDelta;
                }
            });
            
            // 更新卫星
            planet.children.forEach(child => {
                if (child instanceof THREE.Group) {
                    child.rotation.y += 0.02 * scaledDelta;
                }
            });
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
        
        // 更新场景元素
        updateScene(delta);
        
        // 渲染场景
        renderer.render(scene, camera);
        
        // 更新渲染状态
        if (!window._renderedOnce) {
            updateRenderStatus('渲染正常');
            window._renderedOnce = true;
        }
    } catch (e) {
        console.error("动画循环中出错:", e);
        updateRenderStatus('渲染错误', 'red');
    }
}

// 窗口调整
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// 更新渲染状态
function updateRenderStatus(status, color = 'green') {
    const renderStatus = document.getElementById('render-status');
    if (renderStatus) {
        renderStatus.innerHTML = `<span style="color:${color}">${status}</span>`;
    }
    
    const indicator = document.getElementById('render-indicator');
    if (indicator) {
        indicator.style.backgroundColor = color;
    }
}

// 设置基础控制界面
function setupBasicControls() {
    const timeSpeedControl = document.getElementById('time-speed');
    const pauseToggle = document.getElementById('pause-toggle');
    const resetCamera = document.getElementById('reset-camera');
    
    // 时间速度控制
    if (timeSpeedControl) {
        timeSpeedControl.addEventListener('input', function() {
            timeScale = parseFloat(this.value);
            if (document.getElementById('time-speed-value')) {
                document.getElementById('time-speed-value').textContent = timeScale.toFixed(1);
            }
        });
    }
    
    // 暂停/继续按钮
    if (pauseToggle) {
        pauseToggle.addEventListener('click', function() {
            isPaused = !isPaused;
            this.textContent = isPaused ? '继续' : '暂停';
            
            if (!isPaused) {
                clock.getDelta();
            }
        });
    }
    
    // 重置相机按钮
    if (resetCamera) {
        resetCamera.addEventListener('click', function() {
            camera.position.set(0, 40, 100);
            camera.lookAt(0, 0, 0);
            if (controls) {
                controls.target.set(0, 0, 0);
                controls.update();
            }
        });
    }
    
    // 设置鼠标点击事件以选择天体
    setupObjectSelection();
}

// 设置对象选择功能
function setupObjectSelection() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // 监听点击事件
    window.addEventListener('click', function(event) {
        // 计算鼠标点击的归一化设备坐标 (-1 到 +1)
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        // 从相机位置和鼠标位置更新射线
        raycaster.setFromCamera(mouse, camera);
        
        // 获取所有与射线相交的对象
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        if (intersects.length > 0) {
            // 查找被点击的天体
            let selectedObject = null;
            
            for (let i = 0; i < intersects.length; i++) {
                const object = intersects[i].object;
                
                // 检查是否为行星或其子对象
                let parent = object;
                while (parent && !parent.userData.name) {
                    parent = parent.parent;
                }
                
                if (parent && parent.userData.name) {
                    selectedObject = parent;
                    break;
                }
            }
            
            if (selectedObject) {
                // 显示天体信息
                showCelestialInfo(selectedObject.userData.name);
                
                // 聚焦相机到选中对象
                if (controls) {
                    // 动态设置相机位置为物体大小的2倍距离
                    const size = getObjectSize(selectedObject);
                    const distance = Math.max(size * 5, 5);
                    
                    // 移动到对象侧前方以便看到太阳光照效果
                    const targetPos = selectedObject.position.clone();
                    const currentPos = controls.target.clone();
                    
                    // 平滑过渡到新目标点
                    controls.target.set(targetPos.x, targetPos.y, targetPos.z);
                    controls.update();
                }
            }
        }
    });
}

// 显示天体信息
function showCelestialInfo(name) {
    // 检查是否有天体数据API可用
    if (typeof updateInfoPanel === 'function' && typeof getCelestialInfo === 'function') {
        updateInfoPanel(name);
    } else {
        // 回退到简单信息显示
        const infoPanel = document.getElementById('planet-info');
        if (!infoPanel) return;
        
        // 行星名称的中文映射
        const planetNames = {
            "sun": "太阳",
            "mercury": "水星",
            "venus": "金星",
            "earth": "地球",
            "mars": "火星",
            "jupiter": "木星",
            "saturn": "土星",
            "uranus": "天王星",
            "neptune": "海王星"
        };
        
        // 获取并显示行星信息
        if (planets[name]) {
            const planet = planets[name];
            const displayName = planetNames[name] || name;
            
            let html = `<h3>${displayName}</h3>`;
            
            if (name === 'sun') {
                html += `<p>太阳系的中心天体，一颗恒星</p>`;
            } else {
                const distance = planet.userData.distance.toFixed(1);
                const orbitalSpeed = (planet.userData.orbitalSpeed * 1000).toFixed(2);
                
                html += `<p>距太阳: ${distance} 天文单位</p>`;
                html += `<p>公转速度: ${orbitalSpeed}</p>`;
            }
            
            infoPanel.innerHTML = html;
        }
    }
}

// 获取对象大小
function getObjectSize(object) {
    // 计算物体的包围盒大小
    let size = 1;
    
    if (object instanceof THREE.Mesh) {
        // 对于单个网格，使用几何体半径
        const geometry = object.geometry;
        if (geometry.boundingSphere === null) {
            geometry.computeBoundingSphere();
        }
        size = geometry.boundingSphere.radius;
    } else if (object instanceof THREE.Group) {
        // 对于组，尝试找到子网格
        object.traverse(child => {
            if (child instanceof THREE.Mesh) {
                const geometry = child.geometry;
                if (geometry.boundingSphere === null) {
                    geometry.computeBoundingSphere();
                }
                size = Math.max(size, geometry.boundingSphere.radius);
            }
        });
    }
    
    // 考虑对象的缩放
    if (object.scale.x > 0) {
        size *= object.scale.x;
    }
    
    return size;
}

// 页面加载完成后初始化
window.addEventListener('load', init);