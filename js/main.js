// 全局变量
let scene, camera, renderer, controls, composer;
let planets = {};
let asteroids = [];
let stats;
let clock;
let autoRotate = true;
let currentPreset = 'solar';
let bloomPass, bloomLayer;
let raycaster, mouse;
let nebulae = [];
let starField;

// 初始化函数
function init() {
    clock = new THREE.Clock();
    
    // 初始化场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // 初始化相机
    const aspect = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 10000);
    camera.position.set(0, 50, 150);
    
    // 初始化渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    document.getElementById('container').appendChild(renderer.domElement);
    
    // 初始化性能监控
    stats = new Stats();
    document.getElementById('stats').appendChild(stats.dom);
    
    // 初始化轨道控制器
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 500;
    
    // 初始化射线投射器
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    
    // 创建天体
    createSolarSystem();
    
    // 创建星域背景
    createStarField(5000);
    
    // 创建星云
    createNebulae();
    
    // 设置环境光照
    const ambientLight = new THREE.AmbientLight(0x333333);
    scene.add(ambientLight);
    
    // 设置后期处理
    setupPostProcessing();
    
    // 初始化交互事件
    initInteractions();
    
    // 移除加载界面
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
    }, 1500);
    
    // 开始动画循环
    animate();
}

// 创建太阳系
function createSolarSystem() {
    // 太阳
    const sunGeometry = new THREE.SphereGeometry(15, 64, 64);
    const sunMaterial = createSunMaterial();
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
    planets.sun = sun;
    
    // 添加太阳光源
    const sunLight = new THREE.PointLight(0xffffff, 1.5, 1000);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);
    
    // 添加太阳光晕
    const sunGlow = createSunGlow(20);
    sun.add(sunGlow);
    
    // 创建行星
    createPlanet('mercury', 0.38, 30, 0, 0x8a8a8a, 0.01, 0.02, 'textures/mercury.jpg');
    createPlanet('venus', 0.95, 45, 0, 0xffd700, 0.005, -0.01, 'textures/venus.jpg');
    createPlanet('earth', 1, 65, 0.1, 0x2233ff, 0.01, 0.01, 'textures/earth.jpg', 'textures/earth_normal.jpg');
    createPlanet('mars', 0.53, 85, 0.05, 0xff4500, 0.008, 0.012, 'textures/mars.jpg');
    createPlanet('jupiter', 11.2, 125, 0.05, 0xffa500, 0.004, 0.005, 'textures/jupiter.jpg');
    createPlanet('saturn', 9.45, 170, 0.1, 0xffd700, 0.003, 0.004, 'textures/saturn.jpg');
    createPlanet('uranus', 4, 210, 0.1, 0x4deeea, 0.003, 0.006, 'textures/uranus.jpg');
    createPlanet('neptune', 3.88, 245, 0.1, 0x3838ff, 0.002, 0.005, 'textures/neptune.jpg');
    
    // 创建月球
    createMoon(planets.earth, 0.27, 2.5, 0.02, 0xaaaaaa, 'textures/moon.jpg');
    
    // 创建土星环
    createSaturnRings(planets.saturn);
    
    // 创建小行星带
    createAsteroidBelt(100, 85, 125, 0.1, 0.7);
    
    // 创建行星轨道
    createOrbits();
}

// 创建行星
function createPlanet(name, size, distance, tilt, color, orbitalSpeed, rotationSpeed, texturePath, normalMap = null) {
    const planetGeometry = new THREE.SphereGeometry(size, 32, 32);
    
    // 使用纹理时异步加载
    if (texturePath) {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(texturePath, function(texture) {
            let material;
            
            if (normalMap) {
                textureLoader.load(normalMap, function(normal) {
                    material = new THREE.MeshStandardMaterial({
                        map: texture,
                        normalMap: normal,
                        metalness: 0.1,
                        roughness: 0.8
                    });
                    completePlanetSetup();
                });
            } else {
                material = new THREE.MeshStandardMaterial({
                    map: texture,
                    metalness: 0.1,
                    roughness: 0.8
                });
                completePlanetSetup();
            }
            
            function completePlanetSetup() {
                const planet = new THREE.Mesh(planetGeometry, material);
                
                // 轨道
                planet.userData = {
                    name: name,
                    distance: distance,
                    orbitalSpeed: orbitalSpeed,
                    rotationSpeed: rotationSpeed,
                    tilt: tilt,
                    originalPosition: new THREE.Vector3(distance, 0, 0)
                };
                
                // 设置位置和倾斜角度
                planet.position.x = distance;
                planet.rotation.x = tilt;
                
                // 接收阴影
                planet.castShadow = true;
                planet.receiveShadow = true;
                
                scene.add(planet);
                planets[name] = planet;
            }
        });
    } else {
        const material = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.1,
            roughness: 0.8
        });
        
        const planet = new THREE.Mesh(planetGeometry, material);
        
        // 轨道
        planet.userData = {
            name: name,
            distance: distance,
            orbitalSpeed: orbitalSpeed,
            rotationSpeed: rotationSpeed,
            tilt: tilt,
            originalPosition: new THREE.Vector3(distance, 0, 0)
        };
        
        // 设置位置和倾斜角度
        planet.position.x = distance;
        planet.rotation.x = tilt;
        
        // 接收阴影
        planet.castShadow = true;
        planet.receiveShadow = true;
        
        scene.add(planet);
        planets[name] = planet;
    }
}

// 创建月球
function createMoon(parent, size, distance, orbitalSpeed, color, texturePath) {
    const moonGeometry = new THREE.SphereGeometry(size, 32, 32);
    
    if (texturePath) {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(texturePath, function(texture) {
            const moonMaterial = new THREE.MeshStandardMaterial({
                map: texture,
                metalness: 0.1,
                roughness: 0.8
            });
            completeMoonSetup(moonMaterial);
        });
    } else {
        const moonMaterial = new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.1,
            roughness: 0.8
        });
        completeMoonSetup(moonMaterial);
    }
    
    function completeMoonSetup(material) {
        const moon = new THREE.Mesh(moonGeometry, material);
        
        // 创建月球轨道组
        const moonOrbit = new THREE.Group();
        parent.add(moonOrbit);
        
        // 设置位置
        moon.position.x = distance;
        
        // 设置阴影
        moon.castShadow = true;
        moon.receiveShadow = true;
        
        moon.userData = {
            name: `${parent.userData.name}-moon`,
            orbitalSpeed: orbitalSpeed,
            rotationSpeed: 0.005,
            isMoon: true,
            parentName: parent.userData.name
        };
        
        moonOrbit.add(moon);
        return moon;
    }
}

// 创建土星环
function createSaturnRings(saturn) {
    if (!saturn) return;
    
    const innerRadius = 11;
    const outerRadius = 18;
    const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    
    // 调整顶点以创建平面环
    const pos = ringGeometry.attributes.position;
    const v3 = new THREE.Vector3();
    
    for (let i = 0; i < pos.count; i++) {
        v3.fromBufferAttribute(pos, i);
        ringGeometry.attributes.uv.setXY(i, v3.length() < (innerRadius + outerRadius) / 2 ? 0 : 1, 1);
        
        if (v3.x < 0) {
            v3.z = -0.05 * v3.y;
        } else {
            v3.z = 0.05 * v3.y;
        }
        
        pos.setXYZ(i, v3.x, v3.y, v3.z);
    }
    
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('textures/saturn_rings.png', function(texture) {
        const ringMaterial = new THREE.MeshStandardMaterial({
            map: texture,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.8,
            roughness: 0.7
        });
        
        const ring = new THREE.Mesh(ringGeometry, ringMaterial);
        ring.rotation.x = Math.PI / 2;
        ring.castShadow = true;
        ring.receiveShadow = true;
        
        saturn.add(ring);
    });
}

// 创建小行星带
function createAsteroidBelt(count, minRadius, maxRadius, minSize, maxSize) {
    const asteroidGeometries = [
        new THREE.IcosahedronGeometry(1, 0),
        new THREE.TetrahedronGeometry(1, 0),
        new THREE.DodecahedronGeometry(1, 0)
    ];
    
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('textures/asteroid.jpg', function(texture) {
        for (let i = 0; i < count; i++) {
            const radius = Math.random() * (maxRadius - minRadius) + minRadius;
            const angle = Math.random() * Math.PI * 2;
            
            // 随机选择一个几何体
            const randGeo = asteroidGeometries[Math.floor(Math.random() * asteroidGeometries.length)];
            
            // 随机大小
            const size = Math.random() * (maxSize - minSize) + minSize;
            const geometry = randGeo.clone();
            geometry.scale(size, size, size);
            
            // 添加一些噪声使其不规则
            const positions = geometry.attributes.position;
            for (let j = 0; j < positions.count; j++) {
                const vertex = new THREE.Vector3();
                vertex.fromBufferAttribute(positions, j);
                
                // 添加随机偏移
                vertex.x += (Math.random() - 0.5) * 0.2 * size;
                vertex.y += (Math.random() - 0.5) * 0.2 * size;
                vertex.z += (Math.random() - 0.5) * 0.2 * size;
                
                positions.setXYZ(j, vertex.x, vertex.y, vertex.z);
            }
            
            const material = new THREE.MeshStandardMaterial({
                map: texture,
                roughness: 0.8,
                metalness: 0.2
            });
            
            const asteroid = new THREE.Mesh(geometry, material);
            
            // 设置位置
            asteroid.position.x = Math.cos(angle) * radius;
            asteroid.position.z = Math.sin(angle) * radius;
            asteroid.position.y = (Math.random() - 0.5) * 5;
            
            // 随机旋转
            asteroid.rotation.x = Math.random() * Math.PI;
            asteroid.rotation.y = Math.random() * Math.PI;
            asteroid.rotation.z = Math.random() * Math.PI;
            
            // 设置数据
            asteroid.userData = {
                radius: radius,
                angle: angle,
                rotationSpeed: Math.random() * 0.01 + 0.005,
                orbitalSpeed: 0.002 / (radius / 100),
                isAsteroid: true
            };
            
            asteroid.castShadow = true;
            asteroid.receiveShadow = true;
            
            scene.add(asteroid);
            asteroids.push(asteroid);
        }
    });
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
            orbit.position.copy(planets.sun.position);
            scene.add(orbit);
        }
    });
}

// 创建星域背景
function createStarField(count) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    
    const color = new THREE.Color();
    
    for (let i = 0; i < count; i++) {
        // 位置
        const distance = 500 + Math.random() * 1500;
        const theta = THREE.MathUtils.randFloatSpread(360);
        const phi = THREE.MathUtils.randFloatSpread(360);
        
        positions[i * 3] = distance * Math.sin(theta) * Math.cos(phi);
        positions[i * 3 + 1] = distance * Math.sin(theta) * Math.sin(phi);
        positions[i * 3 + 2] = distance * Math.cos(theta);
        
        // 颜色
        const colorChoice = Math.random();
        if (colorChoice < 0.2) {
            color.setRGB(0.9, 0.7, 0.6); // 偏红
        } else if (colorChoice < 0.4) {
            color.setRGB(0.6, 0.7, 0.9); // 偏蓝
        } else if (colorChoice < 0.5) {
            color.setRGB(0.9, 0.9, 0.6); // 偏黄
        } else {
            color.setRGB(0.8, 0.8, 0.9); // 白色
        }
        
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
        
        // 大小
        sizes[i] = Math.random() * 2;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const starsMaterial = new THREE.PointsMaterial({
        size: 1,
        vertexColors: true,
        transparent: true,
        sizeAttenuation: true
    });
    
    starField = new THREE.Points(geometry, starsMaterial);
    scene.add(starField);
}

// 创建星云
function createNebulae() {
    const positions = [
        new THREE.Vector3(-200, 100, -400),
        new THREE.Vector3(300, -50, -350),
        new THREE.Vector3(-180, -200, -300)
    ];
    
    const colors = [
        new THREE.Color(0.8, 0.1, 0.8), // 紫色
        new THREE.Color(0.1, 0.6, 0.8), // 蓝色
        new THREE.Color(0.8, 0.3, 0.1)  // 橙色
    ];
    
    const sizes = [120, 150, 100];
    
    for (let i = 0; i < positions.length; i++) {
        const nebula = createNebula(positions[i], colors[i], sizes[i]);
        nebulae.push(nebula);
    }
}

// 创建单个星云
function createNebula(position, color, size) {
    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const alphas = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);
    
    // 使用柏林噪声创建有机形状
    const scale = 0.01;
    const colorBase = new THREE.Color();
    
    for (let i = 0; i < particleCount; i++) {
        const phi = Math.random() * Math.PI * 2;
        const theta = Math.random() * Math.PI;
        
        // 基础球形分布
        let radius = size * Math.pow(Math.random(), 1/3);
        
        // 添加噪声扭曲
        const noiseValue = noise.simplex3(
            radius * scale * Math.sin(theta) * Math.cos(phi),
            radius * scale * Math.sin(theta) * Math.sin(phi),
            radius * scale * Math.cos(theta)
        );
        
        radius += noiseValue * size * 0.3;
        
        const x = position.x + radius * Math.sin(theta) * Math.cos(phi);
        const y = position.y + radius * Math.sin(theta) * Math.sin(phi);
        const z = position.z + radius * Math.cos(theta);
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        // 基于距离和噪声变化颜色
        const distanceFactor = radius / size;
        colorBase.copy(color);
        
        // 加入一些随机变化
        colorBase.r += THREE.MathUtils.randFloatSpread(0.2);
        colorBase.g += THREE.MathUtils.randFloatSpread(0.2);
        colorBase.b += THREE.MathUtils.randFloatSpread(0.2);
        
        colors[i * 3] = colorBase.r;
        colors[i * 3 + 1] = colorBase.g;
        colors[i * 3 + 2] = colorBase.b;
        
        // 基于距离的透明度
        alphas[i] = THREE.MathUtils.mapLinear(distanceFactor, 0, 1, 0.8, 0.1);
        
        // 基于距离的大小
        sizes[i] = THREE.MathUtils.mapLinear(distanceFactor, 0, 1, 3, 1) * Math.random();
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: nebulaVertexShader,
        fragmentShader: nebulaFragmentShader,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        vertexColors: true
    });
    
    const nebula = new THREE.Points(geometry, particleMaterial);
    nebula.userData = { rotationSpeed: THREE.MathUtils.randFloatSpread(0.0001) };
    scene.add(nebula);
    
    return nebula;
}

// 设置后期处理
function setupPostProcessing() {
    // 创建Bloom渲染通道
    bloomLayer = new THREE.Layers();
    bloomLayer.set(1);
    
    // 设置发光物体
    planets.sun.layers.enable(1);
    
    const renderScene = new THREE.RenderPass(scene, camera);
    
    bloomPass = new THREE.UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5,   // 强度
        0.4,   // 半径
        0.85   // 阈值
    );
    
    const bloomComposer = new THREE.EffectComposer(renderer);
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);
    
    // 添加渲染混合
    const finalPass = new THREE.ShaderPass(
        new THREE.ShaderMaterial({
            uniforms: {
                baseTexture: { value: null },
                bloomTexture: { value: bloomComposer.renderTarget2.texture }
            },
            vertexShader: bloomVertexShader,
            fragmentShader: bloomFragmentShader,
            defines: {}
        }),
        'baseTexture'
    );
    finalPass.needsSwap = true;
    
    composer = new THREE.EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(finalPass);
}

// 更新天体位置和旋转
function updateCelestialBodies(delta) {
    // 更新行星
    Object.keys(planets).forEach(name => {
        if (name !== 'sun') {
            const planet = planets[name];
            if (planet && planet.userData) {
                // 公转
                const angle = planet.userData.orbitalSpeed * delta;
                const x = planet.position.x;
                const z = planet.position.z;
                
                planet.position.x = x * Math.cos(angle) - z * Math.sin(angle);
                planet.position.z = x * Math.sin(angle) + z * Math.cos(angle);
                
                // 自转
                planet.rotation.y += planet.userData.rotationSpeed * delta;
            }
        }
    });
    
    // 更新小行星
    for (let i = 0; i < asteroids.length; i++) {
        const asteroid = asteroids[i];
        
        // 公转
        asteroid.userData.angle += asteroid.userData.orbitalSpeed * delta;
        const radius = asteroid.userData.radius;
        
        asteroid.position.x = Math.cos(asteroid.userData.angle) * radius;
        asteroid.position.z = Math.sin(asteroid.userData.angle) * radius;
        
        // 自转
        asteroid.rotation.x += asteroid.userData.rotationSpeed * delta * 0.5;
        asteroid.rotation.y += asteroid.userData.rotationSpeed * delta;
        asteroid.rotation.z += asteroid.userData.rotationSpeed * delta * 0.3;
    }
    
    // 更新星云
    for (let i = 0; i < nebulae.length; i++) {
        const nebula = nebulae[i];
        nebula.rotation.y += nebula.userData.rotationSpeed * delta;
        nebula.material.uniforms.time.value += delta * 0.1;
    }
}

// 动画循环
function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta() * 50;
    
    // 更新控制器
    controls.update();
    
    if (autoRotate) {
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.5;
    } else {
        controls.autoRotate = false;
    }
    
    // 更新天体
    updateCelestialBodies(delta);
    
    // 更新后期处理
    composer.render();
    
    // 更新性能监控
    stats.update();
}

// 处理窗口大小改变
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
}

// 初始化交互事件
function initInteractions() {
    // 窗口大小改变
    window.addEventListener('resize', onWindowResize, false);
    
    // 鼠标移动
    document.addEventListener('mousemove', onMouseMove, false);
    
    // 鼠标点击
    document.addEventListener('click', onMouseClick, false);
    
    // 控制面板交互
    document.getElementById('stars-count').addEventListener('input', function() {
        const count = parseInt(this.value);
        document.getElementById('stars-count-value').textContent = count;
        
        // 重新创建星域
        scene.remove(starField);
        createStarField(count);
    });
    
    document.getElementById('light-intensity').addEventListener('input', function() {
        const intensity = parseFloat(this.value);
        document.getElementById('light-intensity-value').textContent = intensity.toFixed(1);
        
        // 更新光照
        scene.children.forEach(child => {
            if (child instanceof THREE.PointLight) {
                child.intensity = intensity * 1.5;
            }
        });
    });
    
    document.getElementById('auto-rotate-toggle').addEventListener('click', function() {
        autoRotate = !autoRotate;
        this.textContent = `自动旋转: ${autoRotate ? '开' : '关'}`;
    });
    
    document.getElementById('reset-camera').addEventListener('click', function() {
        // 重置相机位置
        camera.position.set(0, 50, 150);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
    });
    
    // 预设场景
    document.getElementById('preset-solar').addEventListener('click', setSolarPreset);
    document.getElementById('preset-nebula').addEventListener('click', setNebulaPreset);
    document.getElementById('preset-blackhole').addEventListener('click', setBlackholePreset);
}

// 鼠标移动事件
function onMouseMove(event) {
    // 计算归一化的设备坐标
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

// 鼠标点击事件
function onMouseClick(event) {
    // 从相机发出一条射线
    raycaster.setFromCamera(mouse, camera);
    
    // 获取射线和所有网格的交点
    const meshes = [];
    scene.traverse(function(object) {
        if (object instanceof THREE.Mesh && object.userData.name) {
            meshes.push(object);
        }
    });
    
    const intersects = raycaster.intersectObjects(meshes);
    
    if (intersects.length > 0) {
        const object = intersects[0].object;
        showObjectInfo(object);
    }
}

// 显示天体信息
function showObjectInfo(object) {
    const infoPanel = document.getElementById('planet-info');
    let html = "";
    
    if (object.userData.name) {
        const celestialNames = {
            sun: "太阳",
            mercury: "水星",
            venus: "金星",
            earth: "地球",
            mars: "火星",
            jupiter: "木星",
            saturn: "土星",
            uranus: "天王星",
            neptune: "海王星"
        };
        
        const name = celestialNames[object.userData.name] || object.userData.name;
        
        html = `<h3>${name}</h3>`;
        
        if (object.userData.distance) {
            html += `<p>距离太阳: ${object.userData.distance.toFixed(1)} 百万公里</p>`;
        }
        
        if (object.userData.orbitalSpeed) {
            html += `<p>公转速度: ${(object.userData.orbitalSpeed * 1000).toFixed(2)}</p>`;
        }
        
        if (object.userData.rotationSpeed) {
            html += `<p>自转速度: ${(object.userData.rotationSpeed * 1000).toFixed(2)}</p>`;
        }
        
        if (object.userData.isAsteroid) {
            html = "<h3>小行星</h3><p>组成太阳系小行星带的岩石天体</p>";
        }
    }
    
    infoPanel.innerHTML = html;
}

// 太阳系预设
function setSolarPreset() {
    currentPreset = 'solar';
    camera.position.set(0, 50, 150);
    controls.target.set(0, 0, 0);
    
    // 调整发光效果
    bloomPass.strength = 1.5;
    bloomPass.radius = 0.4;
    bloomPass.threshold = 0.85;
}

// 星云预设
function setNebulaPreset() {
    currentPreset = 'nebula';
    
    // 移动相机到星云区域
    const nebulaPosition = nebulae[0].position.clone();
    
    // 平滑过渡到新位置
    const startPosition = camera.position.clone();
    const targetPosition = new THREE.Vector3(
        nebulaPosition.x + 20,
        nebulaPosition.y + 10,
        nebulaPosition.z + 60
    );
    
    // 设置新的控制器目标
    controls.target.copy(nebulaPosition);
    
    // 使用TWEEN进行平滑过渡
    new TWEEN.Tween(startPosition)
        .to(targetPosition, 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(function() {
            camera.position.copy(this);
        })
        .start();
    
    // 调整发光效果
    bloomPass.strength = 2.0;
    bloomPass.radius = 0.6;
    bloomPass.threshold = 0.6;
}

// 黑洞预设
function setBlackholePreset() {
    currentPreset = 'blackhole';
    
    // 如果黑洞还不存在，创建它
    if (!planets.blackhole) {
        createBlackHole();
    }
    
    // 移动相机到黑洞区域
    const blackholePosition = planets.blackhole.position.clone();
    
    // 平滑过渡到新位置
    const startPosition = camera.position.clone();
    const targetPosition = new THREE.Vector3(
        blackholePosition.x,
        blackholePosition.y + 15,
        blackholePosition.z + 60
    );
    
    // 设置新的控制器目标
    controls.target.copy(blackholePosition);
    
    new TWEEN.Tween(startPosition)
        .to(targetPosition, 2000)
        .easing(TWEEN.Easing.Quadratic.InOut)
        .onUpdate(function() {
            camera.position.copy(this);
        })
        .start();
    
    // 调整发光效果
    bloomPass.strength = 2.5;
    bloomPass.radius = 0.7;
    bloomPass.threshold = 0.5;
}

// 创建黑洞
function createBlackHole() {
    const blackholePosition = new THREE.Vector3(-200, -50, -300);
    
    // 黑洞事件视界
    const blackholeGeometry = new THREE.SphereGeometry(10, 64, 64);
    const blackholeMaterial = new THREE.MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 1.0
    });
    
    const blackhole = new THREE.Mesh(blackholeGeometry, blackholeMaterial);
    blackhole.position.copy(blackholePosition);
    blackhole.userData = {
        name: "blackhole",
        rotationSpeed: 0.005
    };
    
    // 吸积盘
    const accretionDiskGeometry = new THREE.RingGeometry(12, 50, 64, 8);
    const accretionDiskMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        vertexShader: accretionDiskVertexShader,
        fragmentShader: accretionDiskFragmentShader,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false
    });
    
    const accretionDisk = new THREE.Mesh(accretionDiskGeometry, accretionDiskMaterial);
    accretionDisk.rotation.x = Math.PI / 2;
    accretionDisk.layers.enable(1); // 让它发光
    
    blackhole.add(accretionDisk);
    
    // 引力透镜效果
    const lensGeometry = new THREE.SphereGeometry(20, 32, 32);
    const lensMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            blackholePosition: { value: blackholePosition }
        },
        vertexShader: lensVertexShader,
        fragmentShader: lensFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide
    });
    
    const lensEffect = new THREE.Mesh(lensGeometry, lensMaterial);
    lensEffect.position.copy(blackholePosition);
    
    scene.add(blackhole);
    scene.add(lensEffect);
    
    planets.blackhole = blackhole;
    planets.blackhole.lensEffect = lensEffect;
    
    // 更新动画循环中的黑洞
    const originalUpdateCelestialBodies = updateCelestialBodies;
    updateCelestialBodies = function(delta) {
        originalUpdateCelestialBodies(delta);
        
        if (planets.blackhole) {
            // 更新吸积盘
            const accretionDisk = planets.blackhole.children[0];
            if (accretionDisk && accretionDisk.material.uniforms) {
                accretionDisk.material.uniforms.time.value += delta * 0.01;
                accretionDisk.rotation.z += 0.001 * delta;
            }
            
            // 更新引力透镜
            if (planets.blackhole.lensEffect && planets.blackhole.lensEffect.material.uniforms) {
                planets.blackhole.lensEffect.material.uniforms.time.value += delta * 0.01;
            }
        }
    };
}

// 页面加载完成后初始化
window.addEventListener('load', init);