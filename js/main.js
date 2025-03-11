// Three.js 太阳系模拟 - 升级版 2023-03-08
let scene, camera, renderer, controls;
let planets = {};
let asteroids = [];
let clock;
let timeScale = 1.0;      // 时间缩放因子
let isPaused = false;     // 暂停状态
let orbitVisibility = 0.5; // 轨道可见性

// 声明后期处理相关变量
let composer, bloomPass, bloomLayer, effectFXAA;

// 检查Three.js版本和API兼容性
function checkThreeVersion() {
    try {
        // 尝试获取THREE.REVISION，这是Three.js版本的标识符
        if (typeof THREE !== 'undefined' && THREE.REVISION) {
            console.log(`Three.js 版本: ${THREE.REVISION}`);
            
            // 检查关键API是否可用
            const apiChanges = {
                // 渲染器API
                "renderer.outputColorSpace": typeof THREE.WebGLRenderer.prototype.outputColorSpace !== 'undefined',
                "renderer.outputEncoding": typeof THREE.WebGLRenderer.prototype.outputEncoding !== 'undefined',
                // 颜色空间常量
                "SRGBColorSpace": typeof THREE.SRGBColorSpace !== 'undefined',
                "sRGBEncoding": typeof THREE.sRGBEncoding !== 'undefined',
                // 色调映射
                "ACESFilmicToneMapping": typeof THREE.ACESFilmicToneMapping !== 'undefined',
                // 后期处理
                "EffectComposer": typeof THREE.EffectComposer !== 'undefined',
                "UnrealBloomPass": typeof THREE.UnrealBloomPass !== 'undefined',
                "ShaderPass": typeof THREE.ShaderPass !== 'undefined'
            };
            
            console.log("API兼容性检查结果:");
            Object.entries(apiChanges).forEach(([api, available]) => {
                console.log(`- ${api}: ${available ? '可用' : '不可用'}`);
            });
            
            return {
                version: THREE.REVISION,
                apiChanges
            };
        } else {
            console.warn("无法确定Three.js版本");
            return {
                version: "未知",
                apiChanges: {}
            };
        }
    } catch (e) {
        console.error("检查Three.js版本出错:", e);
        return {
            version: "错误",
            apiChanges: {},
            error: e.message
        };
    }
}

// 初始化函数
function init() {
    try {
        console.log("初始化太阳系场景...");
        // 记录Three.js版本和API兼容性
        const threeInfo = checkThreeVersion();
        console.log(`使用 Three.js 版本: ${threeInfo.version}`);
        
        // 显示更明确的警告消息
        if (threeInfo.version === "未知" || threeInfo.version === "错误") {
            console.warn("⚠️ Three.js 库可能未正确加载，将尝试使用最基本功能");
        }
        
        // 立即移除加载界面
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // 创建时钟对象用于动画
        clock = new THREE.Clock();
        
        // 创建后期处理用的层
        bloomLayer = new THREE.Layers();
        bloomLayer.set(1); // 将辉光效果放在第1层
        
        // 检查辉光是否工作
        console.log("初始化辉光层: ", bloomLayer);
        
        // 创建场景
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        
        // 创建相机 - 调整位置确保能看到所有行星
        camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 50, 120);
        console.log("相机位置设置为:", camera.position);
        
        // 创建渲染器 - 使用最基本的设置确保兼容性
        renderer = new THREE.WebGLRenderer({ 
            antialias: true
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        
        // 非常重要: 只使用最基本设置，确保渲染器能工作
        try {
            // 尝试设置v0.149.0的outputEncoding
            if (THREE.sRGBEncoding !== undefined) {
                renderer.outputEncoding = THREE.sRGBEncoding;
                console.log("成功设置outputEncoding = sRGBEncoding");
            }
            
            // 记录渲染器信息
            console.log("渲染器创建成功:", {
                domElement: !!renderer.domElement,
                antialias: renderer.antialias,
                size: `${window.innerWidth}x${window.innerHeight}`
            });
        } catch (e) {
            console.warn("渲染器设置失败，使用完全基础设置:", e);
        }
        
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
        
        // 增加环境光亮度，确保行星表面有足够的基础照明
        const ambientLight = new THREE.AmbientLight(0x555555);
        scene.add(ambientLight);
        
        // 创建太阳系
        console.log("开始创建太阳系...");
        createSolarSystem();
        console.log("太阳系创建完成, 场景对象数量:", scene.children.length);
        
        // 创建简单背景星星
        console.log("开始创建背景星星...");
        createSimpleStarfield(1000);
        console.log("背景星星创建完成, 场景对象数量:", scene.children.length);
        
        // 设置最简单的后期处理效果
        setupPostProcessing();
        
        // 额外验证，确保场景中有对象
        if (scene.children.length === 0) {
            console.error("严重错误: 场景中没有对象!");
        } else {
            console.log("初始化完成，场景包含", scene.children.length, "个对象");
        }
        
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

// 检查浏览器是否支持高级特性
function checkSupport() {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
        console.warn("WebGL不可用 - 禁用高级效果");
        return false;
    }
    
    // 检查扩展支持
    const extensions = {
        floatTextures: gl.getExtension('OES_texture_float'),
        standardDerivatives: gl.getExtension('OES_standard_derivatives'),
        shaderTextureLOD: gl.getExtension('EXT_shader_texture_lod'),
        anisotropicFiltering: gl.getExtension('EXT_texture_filter_anisotropic')
    };
    
    let supported = true;
    
    // 记录支持的扩展
    console.log("WebGL支持状态:");
    Object.keys(extensions).forEach(ext => {
        const isSupported = extensions[ext] !== null;
        console.log(`- ${ext}: ${isSupported ? '支持' : '不支持'}`);
        if (!isSupported && (ext === 'floatTextures' || ext === 'standardDerivatives')) {
            supported = false;
        }
    });
    
    if (!supported) {
        console.warn("浏览器不支持一些高级特性 - 部分效果可能无法正常显示");
    }
    
    return supported;
}

// 设置后期处理效果 - 简化版本，只添加性能监控
function setupPostProcessing() {
    console.log("*** 已禁用后期处理效果，使用基本渲染 ***");
    composer = null;
    
    // 只添加性能信息显示
    if (typeof Stats !== 'undefined') {
        try {
            const stats = new Stats();
            stats.showPanel(0); // 0: fps, 1: ms, 2: mb
            const statsElement = document.getElementById('stats');
            if (statsElement) {
                statsElement.appendChild(stats.dom);
            }
            
            // 仅在每帧更新性能计数器
            window._statsUpdate = function() {
                stats.update();
                requestAnimationFrame(window._statsUpdate);
            };
            window._statsUpdate();
        } catch (e) {
            console.warn("无法初始化性能监控", e);
        }
    }
}

// 创建太阳系
function createSolarSystem() {
    console.log("开始创建太阳系...");
    
    // 创建一个简单的太阳 - 只使用最基本的材质确保兼容性
    const sunGeometry = new THREE.SphereGeometry(8, 32, 32);
    console.log("创建太阳几何体成功");
    
    // 使用基本材质，所有浏览器都支持MeshBasicMaterial
    const sunMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,     // 明亮的黄色
        transparent: false   // 不透明
    });
    console.log("创建太阳材质成功");
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
    planets.sun = sun;
    console.log("太阳添加到场景成功!");
    
    // 添加太阳光晕
    createSunGlow(sun);
    console.log("太阳光晕创建成功!");
    
    // 增强太阳光源，提高强度并增加照射距离
    const sunLight = new THREE.PointLight(0xffffff, 2.0, 2000);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
    
    // 添加辅助光源帮助照亮远处的行星
    const helperLight = new THREE.DirectionalLight(0xffffff, 0.3);
    helperLight.position.set(0, 50, 0);
    helperLight.lookAt(0, 0, 0);
    scene.add(helperLight);
    
    // 创建行星
    console.log("开始创建行星...");
    try {
        createPlanet('mercury', 0.8, 12, 0, 0x888888);
        console.log("水星创建成功");
        createPlanet('venus', 1.2, 16, 0, 0xe39e1c);
        console.log("金星创建成功");
        createPlanet('earth', 1.5, 22, 0.1, 0x2233ff);
        console.log("地球创建成功");
        createPlanet('mars', 1, 28, 0.05, 0xff3300);
        console.log("火星创建成功");
        createPlanet('jupiter', 4, 40, 0.05, 0xd8ca9d);
        console.log("木星创建成功");
        createPlanet('saturn', 3.5, 55, 0.1, 0xf0e2a1);
        console.log("土星创建成功");
        createPlanet('uranus', 2.5, 70, 0.1, 0xa6fff8);
        console.log("天王星创建成功");
        createPlanet('neptune', 2.3, 85, 0.1, 0x0000ff);
        console.log("海王星创建成功");
    } catch (e) {
        console.error("创建行星时出错:", e);
    }
    
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

// 创建单个行星 - 简化版本，只使用基本材质
function createPlanet(name, size, distance, tilt, color) {
    try {
        console.log(`开始创建行星 ${name}...`);
        
        // 创建行星组，用于包含行星
        const planetGroup = new THREE.Group();
        
        // 创建基本行星几何体
        const planetGeometry = new THREE.SphereGeometry(size, 32, 32);
        console.log(`${name} 几何体创建成功`);
        
        // 只使用最基本的材质，确保兼容性
        const planetMaterial = new THREE.MeshBasicMaterial({
            color: color
        });
        
        // 创建行星网格
        const planet = new THREE.Mesh(planetGeometry, planetMaterial);
        planetGroup.add(planet);
        console.log(`${name} 添加到行星组`);
        
        // 不添加任何高级效果，确保基本功能工作
        
        // 设置行星数据
        planetGroup.userData = {
            name: name,
            distance: distance,
            orbitalSpeed: 0.02 / Math.sqrt(distance), // 根据距离调整速度
            rotationSpeed: 0.01,
            tilt: tilt
        };
        
        // 设置位置和倾斜角度
        planetGroup.position.x = distance;
        planetGroup.rotation.x = tilt;
        
        // 启用阴影
        planet.castShadow = true;
        planet.receiveShadow = true;
        
        scene.add(planetGroup);
        planets[name] = planetGroup;
        
        console.log(`${name} 添加到场景成功，位置: x=${planetGroup.position.x}, y=${planetGroup.position.y}, z=${planetGroup.position.z}`);
        return planetGroup;
    } catch (e) {
        console.error(`创建行星 ${name} 时出错:`, e);
        
        // 紧急回退 - 创建最简单的行星
        const simpleGeometry = new THREE.SphereGeometry(size, 16, 16);
        const simpleMaterial = new THREE.MeshBasicMaterial({ color: color });
        const simplePlanet = new THREE.Mesh(simpleGeometry, simpleMaterial);
        
        simplePlanet.userData = {
            name: name,
            distance: distance,
            orbitalSpeed: 0.02 / Math.sqrt(distance),
            rotationSpeed: 0.01,
            tilt: tilt
        };
        
        simplePlanet.position.x = distance;
        simplePlanet.rotation.x = tilt;
        
        scene.add(simplePlanet);
        planets[name] = simplePlanet;
        
        return simplePlanet;
    }
}

// 添加行星大气层
function addAtmosphere(planet, size, color, opacity) {
    const atmosphereGeometry = new THREE.SphereGeometry(size, 32, 32);
    const atmosphereMaterial = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: opacity,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending
    });
    
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    planet.parent.add(atmosphere);
    
    return atmosphere;
}

// 添加行星光晕
function addPlanetGlow(planetGroup, size, color, intensity) {
    // 创建自定义着色器材质，实现边缘发光效果
    const glowMaterial = new THREE.ShaderMaterial({
        uniforms: {
            glowColor: { value: new THREE.Color(color) },
            intensity: { value: intensity },
            time: { value: 0 }
        },
        vertexShader: `
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                vNormal = normalize(normalMatrix * normal);
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 glowColor;
            uniform float intensity;
            uniform float time;
            
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                // 计算视角方向
                vec3 viewDirection = normalize(cameraPosition - vPosition);
                
                // 边缘发光效果 - 视角与法线垂直时最强
                float rimEffect = pow(1.0 - abs(dot(vNormal, viewDirection)), 3.0);
                
                // 添加轻微的时间变化，使光晕有些微脉动
                float pulse = 0.95 + 0.05 * sin(time * 0.5);
                
                // 最终颜色
                vec3 finalColor = glowColor * rimEffect * intensity * pulse;
                gl_FragColor = vec4(finalColor, rimEffect * intensity);
            }
        `,
        transparent: true,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const glowGeometry = new THREE.SphereGeometry(size, 32, 32);
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    
    // 添加到userData以便可以在动画中更新时间
    glow.userData = {
        isGlow: true
    };
    
    planetGroup.add(glow);
    return glow;
}

// 为气态巨行星添加云带
function addCloudBands(planet, size, baseColor) {
    // 创建带有条纹的云层
    const bandsGeometry = new THREE.SphereGeometry(size, 32, 32);
    const bandsMaterial = new THREE.ShaderMaterial({
        uniforms: {
            baseColor: { value: new THREE.Color(baseColor) },
            time: { value: 0 }
        },
        vertexShader: `
            varying vec2 vUv;
            varying vec3 vPosition;
            
            void main() {
                vUv = uv;
                vPosition = position;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 baseColor;
            uniform float time;
            varying vec2 vUv;
            varying vec3 vPosition;
            
            // 简单的柏林噪声模拟函数
            float noise(vec2 p) {
                return fract(sin(dot(p.xy, vec2(12.9898, 78.233))) * 43758.5453);
            }
            
            void main() {
                // 计算纬度
                float latitude = vUv.y;
                
                // 创建云带效果 - 使用sin波形
                float bands = sin(latitude * 20.0 + time * 0.1) * 0.5 + 0.5;
                
                // 添加一些噪声使云带不那么规律
                float noise1 = noise(vec2(vUv.x * 10.0 + time * 0.05, vUv.y * 10.0));
                float noise2 = noise(vec2(vUv.x * 5.0 - time * 0.03, vUv.y * 20.0));
                
                // 合并带和噪声
                float clouds = bands * 0.7 + noise1 * 0.2 + noise2 * 0.1;
                
                // 调整颜色 - 基于baseColor但带有一些变化
                vec3 cloudColor = mix(baseColor * 1.2, baseColor * 0.8, clouds);
                
                // 设置部分透明度
                float alpha = 0.6;
                
                gl_FragColor = vec4(cloudColor, alpha);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const bands = new THREE.Mesh(bandsGeometry, bandsMaterial);
    
    // 添加到userData以便可以在动画中更新时间
    bands.userData = {
        isClouds: true
    };
    
    planet.parent.add(bands);
    return bands;
}

// 创建地球卫星（月球）- 简化版本，直接使用颜色材质
function createMoon(parent, size, distance, orbitalSpeed, color) {
    const moonGeometry = new THREE.SphereGeometry(size, 16, 16);
    
    // 与行星使用相同类型的材质
    const moonMaterial = new THREE.MeshLambertMaterial({
        color: color,
        emissive: new THREE.Color(color).multiplyScalar(0.2) // 添加自发光使月球在暗处可见
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

// 创建土星环 - 简化版本，直接使用纯色材质
function createSaturnRings(saturn) {
    const innerRadius = 4;
    const outerRadius = 7;
    const ringGeometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
    
    // 简化为使用基本材质，增加亮度确保可见
    const ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xffefd5,  // 奶油色
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7
    });

    // 创建环网格
    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
    ring.rotation.x = Math.PI / 2;
    
    // 使UV坐标适合环形几何体
    const pos = ringGeometry.attributes.position;
    const uv = ringGeometry.attributes.uv;
    
    for (let i = 0; i < pos.count; i++) {
        const vertex = new THREE.Vector3();
        vertex.fromBufferAttribute(pos, i);
        
        // 计算正确的UV坐标，使纹理正确覆盖环
        const u = (vertex.x / outerRadius + 1) / 2;
        const v = (vertex.y / outerRadius + 1) / 2;
        
        uv.setXY(i, u, v);
    }
    
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
    
    // 几种不同的小行星几何体（增加形状多样性）
    const geometries = [
        new THREE.TetrahedronGeometry(0.2),  // 四面体
        new THREE.IcosahedronGeometry(0.2),  // 二十面体
        new THREE.DodecahedronGeometry(0.2), // 十二面体
        new THREE.OctahedronGeometry(0.2),   // 八面体
        new THREE.SphereGeometry(0.2, 4, 4)  // 低多边形球体
    ];
    
    // 不再尝试加载纹理，直接使用彩色材质
    
    // 创建实例化几何体
    const instanced = {};
    
    // 计算小行星带的倾斜角度
    const beltTilt = Math.PI * 0.05; // 小的倾斜角度
    
    for (let i = 0; i < count; i++) {
        // 随机选择几何体
        const geometryIndex = Math.floor(Math.random() * geometries.length);
        const geometry = geometries[geometryIndex];
        
        // 随机灰色调
        const grayness = 0.4 + Math.random() * 0.3;
        const color = new THREE.Color(grayness, grayness, grayness);
        
        // 使用Lambert材质，更适合没有纹理的表面
        const material = new THREE.MeshLambertMaterial({
            color: color,
            emissive: new THREE.Color(color).multiplyScalar(0.15) // 添加适当的自发光
        });
        
        const asteroid = new THREE.Mesh(geometry, material);
        
        // 随机位置（增加倾斜变化）
        const radius = minRadius + Math.random() * (maxRadius - minRadius);
        const angle = Math.random() * Math.PI * 2;
        
        // 增加小行星带的厚度和不规则性（用高斯分布）
        let height;
        // 创建更自然的高度分布 - 靠近中心平面的小行星更多
        const gaussRand = () => {
            const u = 1 - Math.random(); // 转换为 (0,1] 范围
            const v = 1 - Math.random();
            return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        };
        
        // 使用高斯分布，标准差为0.8，让大多数小行星靠近中心平面
        height = gaussRand() * 0.8;
        
        // 应用小行星带的总体倾斜
        asteroid.position.x = Math.cos(angle) * radius;
        asteroid.position.z = Math.sin(angle) * radius;
        
        // 应用带倾斜角度的变换
        const tiltedY = height;
        const tiltedX = Math.cos(angle) * radius;
        const tiltedZ = Math.sin(angle) * radius;
        
        asteroid.position.x = tiltedX;
        asteroid.position.y = Math.sin(beltTilt) * tiltedZ + tiltedY;
        asteroid.position.z = Math.cos(beltTilt) * tiltedZ;
        
        // 保存高度偏移值到用户数据，用于动画更新
        asteroid.userData.height = tiltedY;
        
        // 随机缩放 - 更加多样化，包括一些更大的小行星
        let scale;
        if (Math.random() < 0.05) {
            // 5%的小行星更大
            scale = 0.8 + Math.random() * 0.7;
        } else {
            // 95%的小行星是正常大小
            scale = 0.3 + Math.random() * 0.5;
        }
        
        // 稍微不均匀的缩放，使小行星形状更加不规则
        const scaleVary = 0.15;
        asteroid.scale.set(
            scale * (1 + (Math.random() - 0.5) * scaleVary),
            scale * (1 + (Math.random() - 0.5) * scaleVary),
            scale * (1 + (Math.random() - 0.5) * scaleVary)
        );
        
        // 随机旋转
        asteroid.rotation.x = Math.random() * Math.PI * 2;
        asteroid.rotation.y = Math.random() * Math.PI * 2;
        asteroid.rotation.z = Math.random() * Math.PI * 2;
        
        // 设置动画数据 (轨道速度随半径的1.5次方反比变化，更接近开普勒定律)
        asteroid.userData = {
            orbitRadius: radius,
            orbitAngle: angle,
            orbitSpeed: 0.02 / Math.pow(radius, 1.5) * (0.8 + Math.random() * 0.4), // 加入一些随机变化
            rotationSpeed: 0.01 + Math.random() * 0.05, // 自转速度
            tilt: beltTilt
        };
        
        scene.add(asteroid);
        asteroids.push(asteroid);
    }
}

// 创建行星轨道
function createOrbits() {
    // 为每个行星创建轨道
    Object.keys(planets).forEach(name => {
        if (name !== 'sun' && name !== 'blackhole') {
            const planet = planets[name];
            
            // 获取行星数据
            const distance = planet.userData.distance;
            const tilt = planet.userData.tilt || 0;
            
            // 创建一个更精细的轨道线条
            const segments = 128;
            const orbitGeometry = new THREE.BufferGeometry();
            const vertices = [];
            
            // 创建一个带有微小椭圆特性的轨道（更自然）
            const eccentricity = 0.05 * (Math.random() * 0.5 + 0.75); // 小的随机偏心率
            const a = distance;                // 半长轴
            const b = distance * (1 - eccentricity); // 半短轴
            const center = new THREE.Vector3(eccentricity * a, 0, 0); // 中心点偏移
            
            // 生成椭圆轨道点
            for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const x = center.x + a * Math.cos(angle);
                const z = b * Math.sin(angle);
                
                // 应用轨道倾斜
                const tiltedY = Math.sin(tilt) * z;
                const tiltedZ = Math.cos(tilt) * z;
                
                vertices.push(x, tiltedY, tiltedZ);
            }
            
            // 设置几何体顶点
            orbitGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            
            // 对于小行星带内部的行星，使用更明显的轨道表示
            // 我们可以添加一个发光效果，让轨道更加明显
            let glowEffect = false;
            if (name === 'mercury' || name === 'venus' || name === 'earth' || name === 'mars') {
                glowEffect = true;
            }
            
            // 创建虚线材质
            const dashSize = 0.8;   // 增加实线长度
            const gapSize = 0.2;    // 保持较小的间隙
            
            // 使用更明亮、更易区分的轨道颜色
            let orbitColor;
            switch (name) {
                case 'mercury': orbitColor = 0xAAAAAA; break; // 水星 - 亮灰色
                case 'venus': orbitColor = 0xFFD700; break;   // 金星 - 金色
                case 'earth': orbitColor = 0x00BFFF; break;   // 地球 - 亮蓝色
                case 'mars': orbitColor = 0xFF4500; break;    // 火星 - 鲜红色
                case 'jupiter': orbitColor = 0xFF8C00; break; // 木星 - 深橙色
                case 'saturn': orbitColor = 0xFFFF00; break;  // 土星 - 亮黄色
                case 'uranus': orbitColor = 0x00FFFF; break;  // 天王星 - 青色
                case 'neptune': orbitColor = 0x0000FF; break; // 海王星 - 纯蓝色
                default: orbitColor = 0xFFFFFF;               // 默认 - 白色
            }
            
            // 创建更明显的轨道线条
            const orbitMaterial = new THREE.LineDashedMaterial({
                color: orbitColor,
                linewidth: 1,         // 注意：由于WEBGL限制，线宽在大多数浏览器中固定为1
                scale: 1,             // 对虚线模式的缩放
                dashSize: dashSize,
                gapSize: gapSize,
                transparent: true,
                opacity: 0.8,         // 提高基础不透明度让轨道更明显
                fog: false            // 禁用雾化效果以保持轨道清晰
            });
            
            // 创建线条对象
            const orbit = new THREE.Line(orbitGeometry, orbitMaterial);
            
            // 计算虚线
            orbit.computeLineDistances();
            
            // 为内部行星添加发光轨道效果 - 这会使轨道在黑色背景上更明显
            if (glowEffect) {
                // 创建一个稍大的轨道作为发光效果
                const glowGeometry = new THREE.BufferGeometry();
                glowGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
                
                // 创建一个发光材质 - 使用相同的颜色但更低的不透明度
                const glowMaterial = new THREE.LineBasicMaterial({
                    color: orbitColor,
                    transparent: true,
                    opacity: 0.3,
                    blending: THREE.AdditiveBlending // 使用加法混合使其看起来发光
                });
                
                const glowOrbit = new THREE.Line(glowGeometry, glowMaterial);
                
                // 稍微放大轨道以创建发光效果
                glowOrbit.scale.set(1.02, 1.02, 1.02);
                
                // 将发光轨道添加到场景
                scene.add(glowOrbit);
                
                // 保存引用以便可以同时调整可见性
                orbit.userData.glowOrbit = glowOrbit;
            }
            
            // 将轨道存储在行星中
            planet.userData.orbit = orbit;
            
            // 添加到场景
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

// 创建增强的星空背景
function createStars(count) {
    try {
        // 尝试创建高级星空效果，如果出错则回退到基本星空
        
        // 创建基本星空
        try {
            createBasicStars(count);
        } catch (e) {
            console.warn("高级星空渲染失败，回退到简单星空", e);
            createSimpleStarfield(count);
            return; // 如果基本星空失败，不尝试更复杂的效果
        }
        
        // 创建距离更近的明亮恒星
        try {
            createBrightStars(count * 0.05);
        } catch (e) {
            console.warn("明亮恒星创建失败", e);
        }
        
        // 创建远处星系
        try {
            createDistantGalaxies(5);
        } catch (e) {
            console.warn("星系创建失败", e);
        }
        
        // 创建尘埃云
        try {
            createDustClouds(3);
        } catch (e) {
            console.warn("尘埃云创建失败", e);
        }
        
        // 创建宇宙射线
        try {
            createCosmicRays();
        } catch (e) {
            console.warn("宇宙射线创建失败", e);
        }
    } catch (e) {
        console.error("星空创建失败:", e);
        // 最终回退 - 确保至少有一些星星
        createSimpleStarfield(count);
    }
}

// 简单的星空渲染 - 用于兼容性
function createSimpleStarfield(count) {
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
        const x = (Math.random() - 0.5) * 2000;
        const y = (Math.random() - 0.5) * 2000;
        const z = (Math.random() - 0.5) * 2000;
        starsVertices.push(x, y, z);
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    scene.add(starField);
    
    return starField;
}

// 创建基本星星
function createBasicStars(count) {
    const starsGeometry = new THREE.BufferGeometry();
    
    // 使用着色器创建更真实的星星效果
    const starsMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0.0 }
        },
        vertexShader: `
            attribute vec3 color;
            varying vec3 vColor;
            varying float vDistance;
            
            void main() {
                vColor = color;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                
                // 计算到相机的距离，用于控制点大小和闪烁
                vDistance = length(mvPosition.xyz);
                
                // 基于距离调整点大小（远处星星更小）
                gl_PointSize = 1.8 * (200.0 / vDistance);
            }
        `,
        fragmentShader: `
            uniform float time;
            varying vec3 vColor;
            varying float vDistance;
            
            void main() {
                // 创建圆形星星
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);
                if (dist > 0.5) discard;  // 圆形蒙版
                
                // 基于距离和时间创建闪烁效果
                float distFactor = 300.0 / vDistance;
                float twinkle = 0.7 + 0.3 * sin(time + gl_FragCoord.x * 20.0 + gl_FragCoord.y * 30.0);
                
                // 边缘发光，中心更亮
                float glow = 1.0 - (dist * 2.0);
                vec3 finalColor = vColor * glow * twinkle * distFactor;
                
                gl_FragColor = vec4(finalColor, 1.0);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const starsVertices = [];
    const starsColors = [];
    
    for (let i = 0; i < count; i++) {
        // 创建以相机为中心的球面分布星星
        const radius = 500 + Math.random() * 1500; // 距离
        const theta = Math.random() * Math.PI * 2; // 水平角度
        const phi = Math.acos(2 * Math.random() - 1); // 垂直角度
        
        // 球面坐标转笛卡尔坐标
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        starsVertices.push(x, y, z);
        
        // 增加更多变化的星星颜色
        const colorChoice = Math.random();
        if (colorChoice < 0.12) {
            // 蓝色恒星（O型和B型恒星）
            starsColors.push(0.6, 0.8, 1.0);
        } else if (colorChoice < 0.18) {
            // 蓝白色恒星（A型恒星）
            starsColors.push(0.8, 0.9, 1.0);
        } else if (colorChoice < 0.30) {
            // 白色恒星（F型恒星）
            starsColors.push(1.0, 1.0, 0.95);
        } else if (colorChoice < 0.50) {
            // 黄色恒星（G型恒星，如太阳）
            starsColors.push(1.0, 0.95, 0.8);
        } else if (colorChoice < 0.70) {
            // 橙色恒星（K型恒星）
            starsColors.push(1.0, 0.7, 0.5);
        } else {
            // 红色恒星（M型恒星）
            starsColors.push(1.0, 0.5, 0.4);
        }
    }
    
    starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
    starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starsColors, 3));
    
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    starField.userData = {
        isStarField: true,
        time: 0
    };
    scene.add(starField);
    
    return starField;
}

// 创建明亮的近距离恒星
function createBrightStars(count) {
    const brightStarsGeometry = new THREE.BufferGeometry();
    
    // 用纹理创建发光星星
    const brightStarsMaterial = new THREE.PointsMaterial({
        size: 3.0,
        vertexColors: true,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    // 设置衍射图案效果
    brightStarsMaterial.onBeforeCompile = function(shader) {
        shader.fragmentShader = shader.fragmentShader.replace(
            'void main() {',
            `
            // 创建衍射图案效果
            float createDiffraction(vec2 coord, float size) {
                vec2 pos = coord - vec2(0.5);
                float d = length(pos);
                if (d > 0.5) return 0.0;
                
                // 主光斑
                float mainGlow = max(0.0, 1.0 - d * 2.0);
                mainGlow = pow(mainGlow, 3.0);
                
                // 水平和垂直光条
                float hBeam = max(0.0, 0.15 - abs(pos.y) * 8.0) * 0.2 * size;
                float vBeam = max(0.0, 0.15 - abs(pos.x) * 8.0) * 0.2 * size;
                
                // 综合效果
                return mainGlow + hBeam * min(1.0, (1.0 - d)) + vBeam * min(1.0, (1.0 - d));
            }
            
            void main() {
            `
        );
        
        shader.fragmentShader = shader.fragmentShader.replace(
            'gl_FragColor = vec4( outgoingLight, diffuseColor.a );',
            `
            float pattern = createDiffraction(gl_PointCoord, 1.0);
            gl_FragColor = vec4(outgoingLight * pattern, pattern * diffuseColor.a);
            `
        );
    };
    
    const brightStarsVertices = [];
    const brightStarsColors = [];
    
    for (let i = 0; i < count; i++) {
        // 近距离恒星应该分布在更接近视点的位置
        const radius = 200 + Math.random() * 500;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        brightStarsVertices.push(x, y, z);
        
        // 更明亮的恒星颜色
        const colorChoice = Math.random();
        
        if (colorChoice < 0.25) {
            // 亮蓝色恒星
            brightStarsColors.push(0.7, 0.9, 1.0);
        } else if (colorChoice < 0.5) {
            // 亮白色恒星
            brightStarsColors.push(1.0, 1.0, 1.0);
        } else if (colorChoice < 0.75) {
            // 亮黄色恒星
            brightStarsColors.push(1.0, 1.0, 0.7);
        } else {
            // 亮红色恒星
            brightStarsColors.push(1.0, 0.6, 0.5);
        }
    }
    
    brightStarsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(brightStarsVertices, 3));
    brightStarsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(brightStarsColors, 3));
    
    const brightStarField = new THREE.Points(brightStarsGeometry, brightStarsMaterial);
    brightStarField.userData = {
        isBrightStars: true
    };
    
    // 将明亮恒星添加到辉光层
    brightStarField.layers.enable(1);
    
    scene.add(brightStarField);
    return brightStarField;
}

// 创建远处星系
function createDistantGalaxies(count) {
    for (let i = 0; i < count; i++) {
        // 星系位置
        const distance = 800 + Math.random() * 1200;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const position = new THREE.Vector3(
            distance * Math.sin(phi) * Math.cos(theta),
            distance * Math.sin(phi) * Math.sin(theta),
            distance * Math.cos(phi)
        );
        
        // 星系类型
        const galaxyType = Math.floor(Math.random() * 3);
        let galaxyColor;
        
        switch (galaxyType) {
            case 0: // 蓝色星系
                galaxyColor = new THREE.Color(0x4169E1);
                break;
            case 1: // 黄色星系
                galaxyColor = new THREE.Color(0xFFD700);
                break;
            case 2: // 红色星系
                galaxyColor = new THREE.Color(0xFF6347);
                break;
        }
        
        // 创建星系
        createGalaxy(position, galaxyColor, 30 + Math.random() * 20);
    }
}

// 创建一个星系
function createGalaxy(position, color, size) {
    const particleCount = 500;
    const galaxyGeometry = new THREE.BufferGeometry();
    
    const galaxyMaterial = new THREE.ShaderMaterial({
        uniforms: {
            baseColor: { value: color },
            time: { value: 0 }
        },
        vertexShader: `
            uniform float time;
            attribute float size;
            attribute float angle;
            attribute float radius;
            attribute float randomOffset;
            
            varying vec3 vColor;
            varying float vAlpha;
            
            void main() {
                // 螺旋星系旋转
                float t = time * 0.05 + randomOffset;
                float a = angle + t * (1.0 - radius * 0.5); // 内部旋转更快
                
                // 螺旋臂公式
                float r = radius;
                float x = r * cos(a);
                float y = position.y * 0.2; // 让星系薄一些
                float z = r * sin(a);
                
                vec3 newPosition = vec3(x, y, z);
                vec4 mvPosition = modelViewMatrix * vec4(newPosition, 1.0);
                gl_Position = projectionMatrix * mvPosition;
                
                // 基于半径确定颜色，外围更蓝，内部更黄/红
                float colorFactor = radius / 1.0;
                if (colorFactor < 0.3) {
                    // 星系中心区域 - 偏黄
                    vColor = vec3(1.0, 0.8, 0.5);
                } else if (colorFactor < 0.7) {
                    // 星系中部 - 混合
                    vColor = vec3(0.9, 0.9, 0.9);
                } else {
                    // 星系外围 - 蓝白
                    vColor = vec3(0.7, 0.8, 1.0);
                }
                
                // 调整点大小
                gl_PointSize = size * (300.0 / length(mvPosition.xyz));
                
                // 透明度，边缘减弱
                vAlpha = 1.0 - colorFactor * 0.7;
            }
        `,
        fragmentShader: `
            uniform vec3 baseColor;
            varying vec3 vColor;
            varying float vAlpha;
            
            void main() {
                // 创建圆形点
                vec2 center = gl_PointCoord - vec2(0.5);
                float dist = length(center);
                if (dist > 0.5) discard;
                
                // 发光边缘效果
                float intensity = 1.0 - dist * 2.0;
                intensity = pow(intensity, 1.5);
                
                // 混合基础星系颜色和粒子颜色
                vec3 finalColor = mix(baseColor, vColor, 0.5) * intensity;
                
                gl_FragColor = vec4(finalColor, vAlpha * intensity);
            }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    // 创建螺旋星系数据
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const angles = new Float32Array(particleCount);
    const radii = new Float32Array(particleCount);
    const randomOffsets = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
        // 随机位置
        const radius = Math.random();
        const angle = Math.random() * Math.PI * 2;
        const armOffset = Math.random() * 0.2; // 螺旋臂宽度
        
        // 螺旋臂参数
        const armAngle = 5 * radius; // 控制螺旋臂弯曲程度
        const finalAngle = angle + armAngle;
        
        // 螺旋坐标
        const x = radius * Math.cos(finalAngle);
        const y = (Math.random() - 0.5) * 0.1; // 扁平结构，有些厚度
        const z = radius * Math.sin(finalAngle);
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        sizes[i] = 0.5 + Math.random() * 1.5;
        angles[i] = finalAngle;
        radii[i] = radius;
        randomOffsets[i] = Math.random() * Math.PI * 2;
    }
    
    galaxyGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    galaxyGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    galaxyGeometry.setAttribute('angle', new THREE.BufferAttribute(angles, 1));
    galaxyGeometry.setAttribute('radius', new THREE.BufferAttribute(radii, 1));
    galaxyGeometry.setAttribute('randomOffset', new THREE.BufferAttribute(randomOffsets, 1));
    
    const galaxy = new THREE.Points(galaxyGeometry, galaxyMaterial);
    galaxy.position.copy(position);
    
    // 随机旋转星系
    galaxy.rotation.x = Math.random() * Math.PI;
    galaxy.rotation.y = Math.random() * Math.PI;
    galaxy.rotation.z = Math.random() * Math.PI;
    
    // 随机缩放
    const galaxyScale = size * (0.8 + Math.random() * 0.4);
    galaxy.scale.set(galaxyScale, galaxyScale, galaxyScale);
    
    galaxy.userData = {
        isGalaxy: true,
        time: Math.random() * 1000
    };
    
    // 部分星系元素应该发光
    if (Math.random() > 0.5) {
        galaxy.layers.enable(1);
    }
    
    scene.add(galaxy);
    return galaxy;
}

// 创建尘埃云
function createDustClouds(count) {
    for (let i = 0; i < count; i++) {
        const cloudPosition = new THREE.Vector3(
            (Math.random() - 0.5) * 2000,
            (Math.random() - 0.5) * 2000,
            (Math.random() - 0.5) * 2000
        );
        
        const cloudColor = new THREE.Color(
            0.3 + Math.random() * 0.2,
            0.3 + Math.random() * 0.2,
            0.4 + Math.random() * 0.3
        );
        
        const cloudSize = 100 + Math.random() * 150;
        const particleCount = 500;
        
        const dustGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        for (let j = 0; j < particleCount; j++) {
            // 创建云形状的分布
            const radius = cloudSize * Math.pow(Math.random(), 0.5); // 边缘密度降低
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[j * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[j * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta) * 0.6;
            positions[j * 3 + 2] = radius * Math.cos(phi);
            
            // 颜色
            const shade = 0.7 + Math.random() * 0.3;
            colors[j * 3] = cloudColor.r * shade;
            colors[j * 3 + 1] = cloudColor.g * shade;
            colors[j * 3 + 2] = cloudColor.b * shade;
            
            // 大小
            sizes[j] = 2 + Math.random() * 3;
        }
        
        dustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        dustGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        dustGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const dustMaterial = new THREE.PointsMaterial({
            size: 1.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        
        const dustCloud = new THREE.Points(dustGeometry, dustMaterial);
        dustCloud.position.copy(cloudPosition);
        
        dustCloud.userData = {
            isDust: true,
            rotationSpeed: (Math.random() - 0.5) * 0.0001
        };
        
        scene.add(dustCloud);
    }
}

// 创建宇宙射线效果
function createCosmicRays() {
    const rayCount = 30;
    const rayGroup = new THREE.Group();
    
    for (let i = 0; i < rayCount; i++) {
        // 每条射线的起点和终点
        const length = 100 + Math.random() * 300;
        const direction = new THREE.Vector3(
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2,
            (Math.random() - 0.5) * 2
        ).normalize();
        
        const start = new THREE.Vector3(
            (Math.random() - 0.5) * 1500,
            (Math.random() - 0.5) * 1500,
            (Math.random() - 0.5) * 1500
        );
        
        const end = new THREE.Vector3().copy(start).add(
            direction.clone().multiplyScalar(length)
        );
        
        // 创建射线几何体
        const rayGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array([
            start.x, start.y, start.z,
            end.x, end.y, end.z
        ]);
        rayGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        // 创建射线材质
        const rayMaterial = new THREE.LineBasicMaterial({
            color: new THREE.Color(0.8, 0.9, 1.0),
            transparent: true,
            opacity: 0.3 + Math.random() * 0.3,
            blending: THREE.AdditiveBlending
        });
        
        const ray = new THREE.Line(rayGeometry, rayMaterial);
        ray.userData = {
            isRay: true,
            lifeTime: Math.random() * 5 + 3, // 射线存在时间(秒)
            age: 0
        };
        
        rayGroup.add(ray);
    }
    
    rayGroup.userData = {
        isRayGroup: true
    };
    
    scene.add(rayGroup);
    return rayGroup;
}

// 更新天体位置和动画
function updateScene(delta) {
    // 如果暂停，则不更新位置
    if (isPaused) return;
    
    // 应用时间缩放
    const scaledDelta = delta * timeScale;
    
    // 更新太阳效果
    if (planets.sun) {
        // 太阳自转
        planets.sun.rotation.y += 0.003 * scaledDelta;
        
        // 更新太阳着色器材质 (如果使用)
        if (planets.sun.material.userData && planets.sun.material.userData.isSun) {
            try {
                planets.sun.material.userData.time += scaledDelta * 0.1;
                planets.sun.material.uniforms.time.value = planets.sun.material.userData.time;
            } catch (e) {
                // 忽略着色器更新错误
            }
        }
        
        // 更新光晕效果
        if (planets.sun.userData.glow) {
            const glow = planets.sun.userData.glow;
            
            // 脉动效果
            glow.pulseFactor += glow.pulseSpeed * scaledDelta;
            const pulse = 0.7 + 0.3 * Math.sin(glow.pulseFactor);
            
            // 更新内外光晕大小和不透明度
            if (glow.outer && glow.inner) {
                glow.outer.scale.set(pulse, pulse, pulse);
                glow.inner.scale.set(pulse * 0.95, pulse * 0.95, pulse * 0.95);
                
                glow.outer.material.opacity = 0.3 * pulse;
                glow.inner.material.opacity = 0.5 * pulse;
            }
        }
    }
    
    // 更新行星位置和特效
    Object.keys(planets).forEach(name => {
        if (name !== 'sun') {
            const planet = planets[name];
            
            // 公转
            if (planet.userData.orbitalSpeed) {
                const angle = planet.userData.orbitalSpeed * scaledDelta;
                const x = planet.position.x;
                const z = planet.position.z;
                
                planet.position.x = x * Math.cos(angle) - z * Math.sin(angle);
                planet.position.z = x * Math.sin(angle) + z * Math.cos(angle);
            }
            
            // 更新行星自转和特效
            updatePlanetEffects(planet, name, scaledDelta);
            
            // 更新卫星位置
            planet.children.forEach(child => {
                if (child instanceof THREE.Group) {
                    child.rotation.y += 0.02 * scaledDelta;
                }
            });
        }
    });
}

// 更新行星效果(着色器时间参数和自转)
function updatePlanetEffects(planetGroup, name, delta) {
    // 更新主行星自转 (第一个子项应该是行星本身)
    let mainPlanet = null;
    
    // 查找主行星和特效对象
    planetGroup.traverse(child => {
        // 找到主行星(应该是最早添加的球体)
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry && !mainPlanet) {
            mainPlanet = child;
        }
        
        // 更新光晕效果时间
        if (child.userData && child.userData.isGlow && child.material.uniforms) {
            child.material.uniforms.time.value += delta * 0.1;
        }
        
        // 更新云带效果时间
        if (child.userData && child.userData.isClouds && child.material.uniforms) {
            child.material.uniforms.time.value += delta * 0.1;
            
            // 为气态巨行星设置特殊自转速度
            if (name === 'jupiter') {
                // 木星云层快速自转
                child.rotation.y += 0.03 * delta;
            } else if (name === 'saturn') {
                // 土星云层略慢一些
                child.rotation.y += 0.025 * delta;
            }
        }
    });
    
    // 为不同行星设置不同的自转速度
    if (mainPlanet) {
        let rotationSpeed = 0.01;  // 默认速度
        
        switch(name) {
            case 'mercury': rotationSpeed = 0.006; break;  // 水星自转最慢(实际上水星自转周期约为58.6天)
            case 'venus': rotationSpeed = 0.004; break;    // 金星自转非常慢且是逆向的(实际上金星自转周期约为243天)
            case 'earth': rotationSpeed = 0.015; break;    // 地球(作为参考,1天)
            case 'mars': rotationSpeed = 0.014; break;     // 火星(略慢于地球)
            case 'jupiter': rotationSpeed = 0.04; break;   // 木星自转最快(约10小时)
            case 'saturn': rotationSpeed = 0.038; break;   // 土星自转也很快
            case 'uranus': 
                // 天王星的特殊自转方向(侧卧)已通过tilt参数设置,这里设置它的速度
                rotationSpeed = 0.02; 
                break;
            case 'neptune': rotationSpeed = 0.032; break;  // 海王星
        }
        
        // 金星逆向自转(这是金星的实际情况)
        if (name === 'venus') {
            mainPlanet.rotation.y -= rotationSpeed * delta;
        } else {
            mainPlanet.rotation.y += rotationSpeed * delta;
        }
    }
    
    // 更新小行星
    asteroids.forEach(asteroid => {
        if (asteroid.userData.orbitSpeed) {
            // 更新轨道位置
            asteroid.userData.orbitAngle += asteroid.userData.orbitSpeed * scaledDelta;
            const radius = asteroid.userData.orbitRadius;
            
            // 考虑轨道倾斜
            const tilt = asteroid.userData.tilt || 0;
            const angle = asteroid.userData.orbitAngle;
            
            // 应用轨道倾斜的变换
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            asteroid.position.x = x;
            asteroid.position.y = Math.sin(tilt) * z + asteroid.userData.height;
            asteroid.position.z = Math.cos(tilt) * z;
            
            // 自转
            asteroid.rotation.x += asteroid.userData.rotationSpeed * scaledDelta * 0.2;
            asteroid.rotation.y += asteroid.userData.rotationSpeed * scaledDelta;
            asteroid.rotation.z += asteroid.userData.rotationSpeed * scaledDelta * 0.3;
        }
    });
    
    // 更新星云和其他深空对象
    scene.children.forEach(child => {
        // 更新原始星云
        if (child instanceof THREE.Points && child.userData.rotationSpeed) {
            // 缓慢旋转
            child.rotation.y += child.userData.rotationSpeed * scaledDelta;
            
            // 如果有脉动效果
            if (child.userData.pulseSpeed) {
                child.userData.pulsePhase += child.userData.pulseSpeed * scaledDelta;
                const pulse = 0.8 + 0.2 * Math.sin(child.userData.pulsePhase);
                
                // 可选：通过缩放模拟脉动效果
                child.scale.set(pulse, pulse, pulse);
            }
        }
        
        // 更新星场闪烁
        if (child.userData && child.userData.isStarField) {
            if (child.material.uniforms) {
                child.material.uniforms.time.value += scaledDelta * 0.05;
            }
        }
        
        // 更新星系旋转
        if (child.userData && child.userData.isGalaxy) {
            if (child.material.uniforms) {
                child.material.uniforms.time.value += scaledDelta * 0.1;
            }
            // 缓慢旋转整个星系
            child.rotation.y += 0.0001 * scaledDelta;
        }
        
        // 更新尘埃云
        if (child.userData && child.userData.isDust) {
            child.rotation.y += child.userData.rotationSpeed * scaledDelta;
        }
        
        // 更新宇宙射线
        if (child.userData && child.userData.isRayGroup) {
            child.children.forEach((ray, index) => {
                // 更新射线年龄
                ray.userData.age += scaledDelta * 0.1;
                
                // 如果射线超过生命周期，重置或移除
                if (ray.userData.age > ray.userData.lifeTime) {
                    // 重新创建新的宇宙射线
                    const length = 100 + Math.random() * 300;
                    const direction = new THREE.Vector3(
                        (Math.random() - 0.5) * 2,
                        (Math.random() - 0.5) * 2,
                        (Math.random() - 0.5) * 2
                    ).normalize();
                    
                    const start = new THREE.Vector3(
                        (Math.random() - 0.5) * 1500,
                        (Math.random() - 0.5) * 1500,
                        (Math.random() - 0.5) * 1500
                    );
                    
                    const end = new THREE.Vector3().copy(start).add(
                        direction.clone().multiplyScalar(length)
                    );
                    
                    // 更新位置
                    const positions = ray.geometry.attributes.position.array;
                    positions[0] = start.x;
                    positions[1] = start.y;
                    positions[2] = start.z;
                    positions[3] = end.x;
                    positions[4] = end.y;
                    positions[5] = end.z;
                    
                    ray.geometry.attributes.position.needsUpdate = true;
                    
                    // 重置年龄和不透明度
                    ray.userData.age = 0;
                    ray.material.opacity = 0.3 + Math.random() * 0.3;
                } else {
                    // 随着年龄增长，淡出射线
                    const lifeFactor = 1.0 - (ray.userData.age / ray.userData.lifeTime);
                    ray.material.opacity = lifeFactor * 0.6;
                }
            });
        }
    });
    
    // 如果黑洞存在，更新黑洞动画
    if (planets.blackhole) {
        const blackhole = planets.blackhole;
        
        // 旋转吸积盘
        blackhole.children.forEach(child => {
            if (child instanceof THREE.Mesh && !(child.geometry instanceof THREE.SphereGeometry)) {
                child.rotation.z += 0.002 * scaledDelta;
            }
        });
        
        // 黑洞脉动
        if (blackhole.userData.pulsePhase === undefined) {
            blackhole.userData.pulsePhase = 0;
        }
        
        blackhole.userData.pulsePhase += 0.01 * scaledDelta;
        const pulse = 0.9 + 0.1 * Math.sin(blackhole.userData.pulsePhase);
        
        // 更新黑洞光晕
        blackhole.children.forEach(child => {
            if (child.geometry instanceof THREE.SphereGeometry && child !== blackhole) {
                child.scale.set(pulse, pulse, pulse);
                
                if (child.material.opacity) {
                    child.material.opacity = 0.1 * pulse;
                }
            }
        });
    }
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
        
        // 完全禁用后期处理，直接使用基础渲染
        console.log("使用基础渲染 - 已禁用后期处理");
        renderer.render(scene, camera);
        
        // 验证场景对象
        if (scene.children.length > 0) {
            // 仅在首次渲染时记录一次
            if (!window._loggedSceneOnce) {
                console.log("场景中的对象数量:", scene.children.length);
                // 列出场景中的所有对象
                scene.children.forEach((child, index) => {
                    const type = child.type || "未知类型";
                    const position = child.position ? 
                        `位置(${child.position.x.toFixed(2)}, ${child.position.y.toFixed(2)}, ${child.position.z.toFixed(2)})` : "无位置信息";
                    console.log(`对象 #${index}: ${type}, ${position}`);
                });
                window._loggedSceneOnce = true;
            }
        } else {
            console.warn("场景中没有对象!");
        }
    } catch (e) {
        console.error("动画循环中出错:", e);
    }
}

// 处理窗口大小改变
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    // 更新渲染器尺寸
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    // 更新后期处理效果尺寸
    if (composer) {
        composer.setSize(window.innerWidth, window.innerHeight);
        
        // 更新FXAA分辨率
        if (effectFXAA) {
            try {
                // 处理不同版本的API差异
                if (effectFXAA.uniforms['resolution'] !== undefined) {
                    effectFXAA.uniforms['resolution'].value.set(
                        1 / window.innerWidth, 
                        1 / window.innerHeight
                    );
                } else if (effectFXAA.uniforms.resolution !== undefined) {
                    effectFXAA.uniforms.resolution.value.set(
                        1 / window.innerWidth, 
                        1 / window.innerHeight
                    );
                }
            } catch (e) {
                console.warn("更新FXAA分辨率失败:", e);
            }
        }
        
        // 更新UnrealBloomPass等其他通道
        if (bloomPass) {
            try {
                // 新版本可能使用不同的分辨率设置方式
                if (bloomPass.resolution !== undefined) {
                    bloomPass.resolution.set(window.innerWidth, window.innerHeight);
                }
            } catch (e) {
                console.warn("更新辉光通道分辨率失败:", e);
            }
        }
    }
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
    const pauseToggle = document.getElementById('pause-toggle');
    const presetSolar = document.getElementById('preset-solar');
    const presetNebula = document.getElementById('preset-nebula');
    const presetBlackhole = document.getElementById('preset-blackhole');
    const starsCount = document.getElementById('stars-count');
    const lightIntensity = document.getElementById('light-intensity');
    const timeSpeedControl = document.getElementById('time-speed');
    const orbitVisibilityControl = document.getElementById('orbit-visibility');
    
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
    
    // 暂停/继续
    if (pauseToggle) {
        pauseToggle.addEventListener('click', function() {
            isPaused = !isPaused;
            this.textContent = isPaused ? '继续' : '暂停';
            
            // 如果恢复播放，重置时钟以避免大跳跃
            if (!isPaused) {
                clock.getDelta(); // 消耗积累的时间
            }
        });
    }
    
    // 时间速度控制
    if (timeSpeedControl) {
        timeSpeedControl.addEventListener('input', function() {
            timeScale = parseFloat(this.value);
            if (document.getElementById('time-speed-value')) {
                document.getElementById('time-speed-value').textContent = timeScale.toFixed(1);
            }
        });
    }
    
    // 轨道可见性控制
    if (orbitVisibilityControl) {
        orbitVisibilityControl.addEventListener('input', function() {
            orbitVisibility = parseFloat(this.value);
            if (document.getElementById('orbit-visibility-value')) {
                document.getElementById('orbit-visibility-value').textContent = orbitVisibility.toFixed(1);
            }
            
            // 更新轨道可见性
            Object.keys(planets).forEach(name => {
                if (name !== 'sun' && name !== 'blackhole') {
                    const planet = planets[name];
                    if (planet.userData.orbit) {
                        // 根据距离对轨道不透明度进行调整
                        const distance = planet.userData.distance;
                        // 基础不透明度为0.8，远距离轨道减少较少不透明度以保持可见性
                        const baseOpacity = Math.max(0.4, 0.8 - distance * 0.002);
                        planet.userData.orbit.material.opacity = baseOpacity * orbitVisibility;
                        
                        // 当完全透明时完全隐藏轨道（性能优化）
                        planet.userData.orbit.visible = (orbitVisibility > 0);
                        
                        // 如果存在发光轨道，同时更新其可见性和不透明度
                        if (planet.userData.orbit.userData.glowOrbit) {
                            const glowOrbit = planet.userData.orbit.userData.glowOrbit;
                            // 计算发光轨道的不透明度 - 基本不透明度的一半，且在轨道可见性为0时完全隐藏
                            glowOrbit.material.opacity = baseOpacity * 0.4 * orbitVisibility;
                            glowOrbit.visible = (orbitVisibility > 0);
                        }
                    }
                }
            });
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
            
            // 更新光照 - 确保同时更新所有类型的光源
            scene.children.forEach(child => {
                if (child instanceof THREE.PointLight) {
                    child.intensity = intensity * 2.0; // 点光源强度更高
                } else if (child instanceof THREE.DirectionalLight) {
                    child.intensity = intensity * 0.3; // 定向光源强度较低
                } else if (child instanceof THREE.AmbientLight) {
                    // 更新环境光强度，确保在低光照条件下仍有基础照明
                    const baseIntensity = 0x555555;
                    const color = new THREE.Color(baseIntensity);
                    color.multiplyScalar(intensity);
                    child.color.set(color);
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
    
    // 添加轨道图例的显示/隐藏控制
    const orbitLegend = document.getElementById('orbit-legend');
    if (orbitLegend) {
        // 创建一个切换按钮
        const toggleButton = document.createElement('button');
        toggleButton.textContent = '隐藏图例';
        toggleButton.className = 'toggle-legend';
        toggleButton.style.position = 'absolute';
        toggleButton.style.top = '5px';
        toggleButton.style.right = '5px';
        toggleButton.style.fontSize = '0.7em';
        toggleButton.style.padding = '2px 5px';
        
        // 添加到信息面板
        const infoPanel = document.getElementById('info-panel');
        if (infoPanel) {
            // 使用相对定位但不改变原始位置
            infoPanel.style.position = 'absolute'; 
            infoPanel.style.top = '20px';
            infoPanel.style.right = '20px';
            infoPanel.appendChild(toggleButton);
        }
        
        // 添加切换功能
        toggleButton.addEventListener('click', function() {
            if (orbitLegend.style.display === 'none') {
                orbitLegend.style.display = 'block';
                this.textContent = '隐藏图例';
            } else {
                orbitLegend.style.display = 'none';
                this.textContent = '显示图例';
            }
        });
    }
});