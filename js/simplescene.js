// 最简单的Three.js场景，确保基本渲染功能正常
let scene, camera, renderer;
let sun, earth, jupiter;

function init() {
    console.log("初始化基本场景...");
    
    // 更新渲染状态
    const renderStatus = document.getElementById('render-status');
    if (renderStatus) {
        renderStatus.innerHTML = '<span style="color:yellow">初始化中...</span>';
    }
    
    // 创建场景
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    
    // 创建相机
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 30, 60); // 从正面观察
    
    // 创建渲染器
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);
    
    // 添加基础光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // 创建太阳
    const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    sun = new THREE.Mesh(sunGeometry, sunMaterial);
    scene.add(sun);
    console.log("太阳添加到场景");
    
    // 创建地球
    const earthGeometry = new THREE.SphereGeometry(2, 32, 32);
    const earthMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    earth = new THREE.Mesh(earthGeometry, earthMaterial);
    earth.position.set(15, 0, 0);
    scene.add(earth);
    console.log("地球添加到场景");
    
    // 创建木星
    const jupiterGeometry = new THREE.SphereGeometry(4, 32, 32);
    const jupiterMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa88 });
    jupiter = new THREE.Mesh(jupiterGeometry, jupiterMaterial);
    jupiter.position.set(30, 0, 0);
    scene.add(jupiter);
    console.log("木星添加到场景");
    
    // 添加轨道控制器，如果有的话
    if (typeof THREE.OrbitControls !== 'undefined') {
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
    } else {
        console.warn("OrbitControls 不可用");
    }
    
    // 显示渲染器信息
    console.log("渲染器信息:", {
        renderer: renderer ? "已创建" : "创建失败",
        domElement: renderer.domElement ? "已创建" : "创建失败",
        size: `${window.innerWidth}x${window.innerHeight}`
    });
    
    // 窗口调整
    window.addEventListener('resize', onWindowResize);
    
    // 添加渲染测试指示灯
    const indicator = document.createElement('div');
    indicator.style.position = 'fixed';
    indicator.style.bottom = '100px';
    indicator.style.right = '20px';
    indicator.style.width = '30px';
    indicator.style.height = '30px';
    indicator.style.borderRadius = '50%';
    indicator.style.backgroundColor = 'yellow';
    indicator.style.border = '2px solid white';
    indicator.style.zIndex = '10000';
    indicator.id = 'render-indicator';
    document.body.appendChild(indicator);
    
    // 隐藏加载界面
    const loadingElement = document.getElementById('loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    // 开始动画
    animate();
    
    console.log("基本场景初始化完成.");
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    // 更新渲染状态为成功
    if (!window._renderedOnce) {
        const renderStatus = document.getElementById('render-status');
        if (renderStatus) {
            renderStatus.innerHTML = '<span style="color:green">渲染正常</span>';
        }
        window._renderedOnce = true;
        console.log("Three.js场景渲染成功！");
    }
    
    // 旋转太阳
    if (sun) sun.rotation.y += 0.005;
    
    // 旋转地球轨道
    if (earth) {
        const earthTime = Date.now() * 0.0005;
        earth.position.x = 15 * Math.cos(earthTime);
        earth.position.z = 15 * Math.sin(earthTime);
        earth.rotation.y += 0.01;
    }
    
    // 旋转木星轨道
    if (jupiter) {
        const jupiterTime = Date.now() * 0.0002;
        jupiter.position.x = 30 * Math.cos(jupiterTime);
        jupiter.position.z = 30 * Math.sin(jupiterTime);
        jupiter.rotation.y += 0.005;
    }
    
    // 渲染场景
    renderer.render(scene, camera);
    
    // 更新渲染指示灯
    const indicator = document.getElementById('render-indicator');
    if (indicator) {
        indicator.style.backgroundColor = 'green';
    }
}

// 页面加载完成后初始化
window.addEventListener('load', init);