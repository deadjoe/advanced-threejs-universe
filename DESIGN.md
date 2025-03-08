# Three.js 太阳系可视化项目设计文档

## 1. 项目概述

### 1.1 项目简介
本项目是一个基于Three.js的交互式太阳系模拟可视化系统，旨在提供沉浸式的宇宙探索体验。系统模拟了太阳系的核心元素，包括太阳、八大行星、卫星、小行星带，以及宇宙背景。项目注重视觉效果和交互体验，同时兼顾性能和兼容性。

### 1.2 主要目标
- 创建真实感的太阳系模拟，遵循基本的天体物理学规律
- 提供流畅的用户交互体验，支持场景探索和天体信息查看
- 实现高质量的视觉效果，同时保持良好的性能
- 确保跨设备兼容性和可访问性

### 1.3 技术栈
- **渲染引擎**: Three.js
- **着色器**: GLSL
- **辅助库**: 原生JavaScript
- **构建工具**: 无（直接加载）
- **部署环境**: 现代Web浏览器（支持WebGL）

## 2. 架构设计

### 2.1 整体架构

```
                   +----------------+
                   |     用户界面     |
                   +-------+--------+
                           |
                           v
+--------+         +-------+--------+         +---------+
| 事件处理 | <-----> |   核心渲染引擎   | <-----> | 场景管理 |
+--------+         +-------+--------+         +---------+
                           |
                           v
             +-------------+-------------+
             |                           |
     +-------+-------+           +-------+-------+
     |   天体系统    |           |  视觉效果系统  |
     +---------------+           +---------------+
```

### 2.2 核心模块

#### 2.2.1 渲染引擎
- 负责初始化Three.js场景、相机和渲染器
- 实现主循环，处理动画和渲染
- 管理性能监控和优化

#### 2.2.2 场景管理
- 组织场景图层结构（Group容器）
- 处理天体的添加和移除
- 管理场景资源

#### 2.2.3 天体系统
- 实现太阳、行星、卫星的创建和物理属性
- 管理轨道计算和运动模拟
- 处理天体之间的关系（如卫星围绕行星）

#### 2.2.4 视觉效果系统
- 实现特殊视觉效果（光晕、大气层等）
- 创建和管理粒子系统（星空、星云等）
- 处理材质和纹理

#### 2.2.5 事件处理
- 管理用户输入（鼠标、触摸事件）
- 实现射线交互（天体选择）
- 处理相机控制和导航

#### 2.2.6 用户界面
- 提供控制面板和信息显示
- 管理UI元素和布局
- 处理用户配置和设置

## 3. 场景设计

### 3.1 场景层级结构

```
scene (THREE.Scene)
├── ambientLight (THREE.AmbientLight)
├── directionalLight (THREE.DirectionalLight)
├── solarSystemGroup (THREE.Group) - 太阳系容器，用于整体移动
│   ├── sun (THREE.Mesh) - 太阳
│   │   ├── sunGlow (THREE.Mesh) - 太阳光晕
│   │   └── sunLight (THREE.PointLight) - 太阳发出的光
│   ├── mercury (THREE.Mesh) - 水星
│   ├── venus (THREE.Mesh) - 金星
│   ├── earth (THREE.Mesh) - 地球
│   │   ├── atmosphere (THREE.Mesh) - 地球大气层
│   │   └── moonSystem (THREE.Group) - 月球系统
│   │       ├── moon (THREE.Mesh) - 月球
│   │       └── moonOrbit (THREE.Line) - 月球轨道
│   ├── mars (THREE.Mesh) - 火星
│   ├── asteroidBelt (Array<THREE.Mesh>) - 小行星带
│   ├── jupiter (THREE.Mesh) - 木星
│   ├── saturn (THREE.Mesh) - 土星
│   │   └── saturnRings (THREE.Mesh) - 土星环
│   ├── uranus (THREE.Mesh) - 天王星
│   ├── neptune (THREE.Mesh) - 海王星
│   └── orbits (Array<THREE.Line>) - 行星轨道
└── starField (THREE.Points) - 星空背景
```

### 3.2 坐标系统
- 使用右手坐标系：X轴向右，Y轴向上，Z轴向前
- 太阳位于原点(0,0,0)
- 行星沿X-Z平面绕太阳运行，考虑轨道倾角
- 整个太阳系通过Group向Y轴正方向偏移，保持在屏幕视野中央

### 3.3 摄像机配置
- 使用透视相机(PerspectiveCamera)
- 默认位置: (0, 30, 60) - 提供俯视视角
- 视野(FOV): 60度
- 近平面: 0.1，远平面: 1000
- 默认注视点(target): (0, 20, 0) - 指向太阳系中心上方

## 4. 对象设计

### 4.1 天体基类（概念设计）
```javascript
/**
 * 天体对象基本结构
 */
{
    // 网格对象
    mesh: THREE.Mesh,
    
    // 元数据
    userData: {
        name: String,           // 天体名称
        distance: Number,       // 距太阳距离
        orbitalSpeed: Number,   // 公转速度
        rotationSpeed: Number,  // 自转速度
        tilt: Number,           // 轨道倾角
        currentRotation: Number // 当前旋转角度（累积）
    },
    
    // 相关组件
    components: {
        orbit: THREE.Line,      // 轨道线
        atmosphere: THREE.Mesh, // 可选：大气层
        rings: THREE.Mesh,      // 可选：行星环
        satellites: Array       // 可选：卫星
    }
}
```

### 4.2 关键对象详细设计

#### 4.2.1 太阳 (Sun)
- **几何体**: SphereGeometry(5, 32, 32)
- **材质**: MeshBasicMaterial({ color: 0xffff00 })
- **特殊效果**:
  - 三层光晕（内、中、外）使用不同的透明度和尺寸
  - 发光效果通过光晕脉动实现

#### 4.2.2 行星 (Planets)
- **几何体**: SphereGeometry(size, 32, 32) - size因行星而异
- **材质**: MeshLambertMaterial
- **运动模拟**:
  - 公转速度与距离成反比关系（近似开普勒第三定律）
  - 自转速度根据行星大小调整
  - 轨道倾角通过矩阵变换实现

#### 4.2.3 特殊天体

**4.2.3.1 土星环 (Saturn Rings)**
- **几何体**: RingGeometry(3.5, 5.5, 64)
- **材质**: MeshBasicMaterial({ color: 0xf8e8c0, transparent: true, opacity: 0.7, side: THREE.DoubleSide })

**4.2.3.2 地球大气层 (Earth Atmosphere)**
- **几何体**: SphereGeometry(1.58, 32, 32) - 略大于地球
- **材质**: MeshBasicMaterial({ color: 0x3388ff, transparent: true, opacity: 0.2, side: THREE.BackSide })

**4.2.3.3 小行星带 (Asteroid Belt)**
- 多个小型几何体组成（TetrahedronGeometry, IcosahedronGeometry, BoxGeometry）
- 随机分布在火星和木星轨道之间

#### 4.2.4 背景元素

**4.2.4.1 星空 (Star Field)**
- **对象类型**: Points
- **几何体**: BufferGeometry + 随机生成的顶点
- **材质**: PointsMaterial({ size: 1.0, vertexColors: true, transparent: true })
- **颜色分布**: 根据恒星类型分配不同的颜色（O/B型: 蓝色, A型: 蓝白色, F/G型: 黄色, K型: 橙色, M型: 红色）

## 5. 行为与交互设计

### 5.1 天体运动

#### 5.1.1 公转运动
行星沿椭圆轨道围绕太阳运动，位置计算如下：
```javascript
planet.position.x = distance * Math.cos(angle);
planet.position.y = distance * Math.sin(angle) * Math.sin(tilt); // 考虑轨道倾角
planet.position.z = distance * Math.sin(angle) * Math.cos(tilt);
```

#### 5.1.2 自转运动
行星绕自身轴线旋转，使用累积旋转值：
```javascript
if (planet.userData.currentRotation === undefined) {
    planet.userData.currentRotation = 0;
}
planet.userData.currentRotation += planet.userData.rotationSpeed * 0.1;
planet.rotation.y = planet.userData.currentRotation;
```

#### 5.1.3 卫星运动
卫星（如月球）围绕行星运动：
```javascript
// 月球轨道旋转
moonOrbit.rotation.y += moonOrbit.userData.rotationSpeed;
```

### 5.2 用户交互

#### 5.2.1 相机控制
使用OrbitControls实现相机交互：
- 平移：鼠标左键拖拽
- 旋转：鼠标右键拖拽
- 缩放：滚轮或触摸缩放

#### 5.2.2 天体选择
通过射线投射(Raycasting)实现天体选择：
```javascript
// 射线投射逻辑
raycaster.setFromCamera(mouse, camera);
const intersects = raycaster.intersectObjects(scene.children, true);
if (intersects.length > 0) {
    const object = intersects[0].object;
    // 处理选中对象...
}
```

#### 5.2.3 信息显示
选中天体后在信息面板显示其详细信息：
- 名称和描述
- 物理特性（直径、距离等）
- 相关图片和说明

### 5.3 控制面板功能
提供以下控制选项：
- 时间速度调整（加速/减慢天体运动）
- 轨道可见性控制
- 相机自动旋转开关
- 重置相机视角
- 预设场景切换

## 6. 渲染流程

### 6.1 初始化流程

1. **场景初始化**:
   ```javascript
   scene = new THREE.Scene();
   camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
   renderer = new THREE.WebGLRenderer({ antialias: true });
   ```

2. **创建太阳系容器**:
   ```javascript
   solarSystemGroup = new THREE.Group();
   solarSystemGroup.position.y = 25; // 向上偏移以在屏幕中居中
   scene.add(solarSystemGroup);
   ```

3. **添加光照**:
   ```javascript
   const ambientLight = new THREE.AmbientLight(0x404040);
   scene.add(ambientLight);
   
   const sunLight = new THREE.PointLight(0xffffff, 1.5, 300);
   solarSystemGroup.add(sunLight);
   ```

4. **创建天体**:
   ```javascript
   // 创建太阳
   createSun();
   
   // 创建行星
   Object.entries(planetData).forEach(([name, data]) => {
       createPlanet(name, data.size, data.distance, data.color, data.tilt);
   });
   
   // 创建轨道、小行星带等
   createOrbits();
   createAsteroidBelt(24, 26, 50);
   ```

5. **设置事件监听**:
   ```javascript
   window.addEventListener('resize', onWindowResize);
   setupPlanetClickEvents();
   ```

### 6.2 渲染循环

```javascript
function animate() {
    requestAnimationFrame(animate);
    
    // 更新控制器
    if (controls) {
        controls.update();
    }
    
    // 更新太阳
    updateSun();
    
    // 更新行星位置和旋转
    updatePlanets();
    
    // 更新小行星
    updateAsteroids();
    
    // 渲染场景
    renderer.render(scene, camera);
}
```

### 6.3 更新函数

#### 6.3.1 更新太阳
```javascript
function updateSun() {
    // 更新太阳自转
    if (sun.userData.currentRotation === undefined) {
        sun.userData.currentRotation = 0;
    }
    sun.userData.currentRotation += 0.005;
    sun.rotation.y = sun.userData.currentRotation;
    
    // 更新光晕脉动
    if (sun.userData.glow) {
        sun.userData.glowPulse += 0.01;
        const pulse = 0.9 + 0.1 * Math.sin(sun.userData.glowPulse);
        
        // 应用脉动效果
        applyPulse(sun.userData.glow, pulse);
    }
}
```

#### 6.3.2 更新行星
```javascript
function updatePlanets() {
    const now = Date.now() * 0.001;
    
    Object.values(planets).forEach(planet => {
        const distance = planet.userData.distance;
        const speed = planet.userData.orbitalSpeed;
        const tilt = planet.userData.tilt;
        
        // 计算轨道位置
        const angle = now * speed;
        planet.position.x = distance * Math.cos(angle);
        planet.position.y = distance * Math.sin(angle) * Math.sin(tilt);
        planet.position.z = distance * Math.sin(angle) * Math.cos(tilt);
        
        // 更新自转
        updateRotation(planet);
        
        // 更新卫星
        updateSatellites(planet);
    });
}
```

## 7. 性能优化策略

### 7.1 几何体优化
- 使用适当的多边形数量，避免过度细分
- 对小物体使用低多边形模型
- 使用实例化渲染(InstancedMesh)处理大量相似对象(小行星)

### 7.2 材质优化
- 对远处物体使用简单材质
- 避免过多的透明物体和混合操作
- 根据设备性能动态调整材质复杂度

### 7.3 渲染优化
- 使用合适的渲染分辨率（基于设备像素比）
- 限制更新频率的组件（如UI更新）
- 仅在需要时更新视图（当相机或物体移动）

### 7.4 兼容性处理
- 检测WebGL支持和扩展可用性
- 提供降级渲染路径
- 根据设备性能自动调整效果复杂度

## 8. 扩展和未来优化

### 8.1 潜在扩展
- 添加更多天体（矮行星、彗星等）
- 实现真实的物理模拟（引力、碰撞等）
- 添加时间控制（历史位置查看，未来预测）
- 支持VR/AR模式

### 8.2 代码优化
- 实现完整的模块化架构
- 添加单元测试和性能测试
- 优化资源加载策略（懒加载，预加载）
- 改进事件处理和状态管理

### 8.3 视觉增强
- 添加高分辨率纹理
- 实现更复杂的后期处理效果
- 改进光照模型和阴影
- 添加环境效果（太空尘埃，光照散射）

## 9. 结论

本设计文档详细描述了Three.js太阳系可视化项目的架构、组件和实现策略。项目采用分层设计，清晰分离天体系统、视觉效果和交互控制，便于维护和扩展。通过Three.js的强大功能，结合自定义着色器和粒子系统，实现了逼真的太阳系模拟，同时考虑了性能优化和兼容性。

使用Group容器组织场景结构是一个重要的设计决策，它使整个太阳系可以作为一个整体移动，简化了天体的管理和交互实现。未来的开发可以在此基础上扩展更多功能，如添加更多天体或实现更复杂的物理模拟。

---

*文档版本: 1.0*  
*最后更新: 2025-03-09*  
*作者: Claude*