# react-native-location 鸿蒙适配版 · 真机测试文档

> 适用对象:`ohos/example` Demo App(`com.example.application`)
> 对齐基线:react-native-location **2.5.0** 官方接口面(npm 包)
> 文档版本:2026-09-11

---

## 1. 测试环境与准备

| 项 | 要求 |
|---|---|
| 设备 | HarmonyOS 真机(推荐;模拟器仅能跑部分用例,无传感器/无 GNSS 的用例见标注) |
| 系统开关 | **设置 → 隐私 → 位置信息** 总开关开启(关闭状态用于告警用例) |
| App 状态 | 首次安装,权限均为「未授权」状态(见 §5.1 权限重置方法) |
| 网络 | 开启(WLAN/移动数据),网络定位通道可用 |
| 环境 | 建议靠窗或户外(GNSS 冷启动更快);室内可验证网络定位 |

**安装方式**(产物:签名 HAP):

```bash
# 构建链(在 example 目录)
npm run fast:pkg          # 重打包库 + codegen + 出 bundle
# 在 example/harmony 目录(需 DEVECO_SDK_HOME)
hvigorw --mode module -p product=default assembleHap

# 安装启动(hdc)
hdc shell mkdir data/local/tmp/rnloc_install
hdc file send <项目>/entry/build/default/outputs/default/entry-default-signed.hap data/local/tmp/rnloc_install/entry.hap
hdc shell bm install -p data/local/tmp/rnloc_install
hdc shell aa start -a EntryAbility -b com.example.application
```

---

## 2. 用例总览(26 例,含对应接口/属性)

| 模块 | 编号 | 用例 | 对应接口/属性 | 验证目标 |
|---|---|---|---|---|
| 权限 | TC-PERM-01 | 申请权限(前台) | `requestPermission({ios:'whenInUse'})` | 鸿蒙前台组合权限申请与返回值 |
| 权限 | TC-PERM-02 | 申请权限(含后台) | `requestPermission({ios:'always'})` | 前台组合 + `LOCATION_IN_BACKGROUND` |
| 权限 | TC-PERM-03 | android.fine 风格 | `requestPermission({android:{detail:'fine'}})` | JS 侧 harmony 分支路由 |
| 权限 | TC-PERM-04 | android.coarse 风格 | `requestPermission({android:{detail:'coarse'}})` | coarse 档位判定（authorizedFine/authorizedCoarse 均通过） |
| 权限 | TC-PERM-05 | 刷新状态 | `getCurrentPermission()` / `checkPermission()` | 状态查询与三档校验 |
| 权限 | TC-PERM-06 | 权限变化事件 | `subscribeToPermissionUpdates()` | `authorizationStatusDidChange` 事件链路 |
| 配置 | TC-CFG-01 | 高精度+5m | `configure({distanceFilter, interval, desiredAccuracy.android})` | 高精度映射 + 距离/时间过滤生效 |
| 配置 | TC-CFG-02 | 低功耗+100m | `configure({desiredAccuracy.android:'lowPower'})` | LOW_POWER 映射(网络定位) |
| 配置 | TC-CFG-03 | headingFilter 10° | `configure({headingFilter})` | 航向角度阈值过滤 |
| 配置 | TC-CFG-04 | 恢复默认 | `configure({})` | 只改传入项语义 + 默认值 |
| 配置 | TC-CFG-05 | fastestInterval/maxWaitTime | `configure({fastestInterval, maxWaitTime})` | 三者取最小换算 `timeInterval` |
| 配置 | TC-CFG-06 | balancedPower/noPower | `configure({desiredAccuracy.android:'balancedPowerAccuracy'})` | 第 3/4 档 → LOW_POWER 映射 |
| 定位 | TC-LOC-01 | 订阅/退订 | `subscribeToLocationUpdates()` / `locationUpdated` 事件 / `Subscription` | 数组负载、退订、最后已知位置立即回报 |
| 定位 | TC-LOC-02 | 配置联动频率 | `configure()` × `subscribeToLocationUpdates()` | 配置变更对运行中订阅实际生效 |
| 定位 | TC-LOC-03 | 无权限订阅 | `subscribeToLocationUpdates()` + `onWarning`(403) | 鸿蒙 201 → 库 403 错误映射 |
| 定位 | TC-LOC-04 | 总开关关闭 | `onWarning`(500) | 鸿蒙 3301100 → 库 500 错误映射 |
| 单次 | TC-GLL-01 | 15s 超时 | `getLatestLocation({timeout:15000})` | 显式超时封装逻辑 |
| 单次 | TC-GLL-02 | timeout:null | `getLatestLocation({timeout:null})` | 不超时语义(等到首个位置) |
| 单次 | TC-GLL-03 | 缺省超时 | `getLatestLocation()` | 库默认 10s 超时 |
| 单次 | TC-GLL-04 | 超时返回 null | `getLatestLocation()` 超时路径 | 超时 resolve `null`(非 reject) |
| 航向 | TC-HDG-01 | 航向订阅 | `subscribeToHeadingUpdates()` / `Heading.heading` | `headingUpdated` 事件、0-360 罗盘一致性 |
| 航向 | TC-HDG-02 | 航向阈值 | `configure({headingFilter})` × `subscribeToHeadingUpdates()` | 阈值过滤(含 0/360 跨界) |
| 航向 | TC-HDG-03 | 无传感器降级 | `subscribeToHeadingUpdates()` + `onWarning`(502) | 模拟器无传感器降级不崩溃 |
| 显著位置 | TC-SIG-01 | 显著位置变化 | `subscribeToSignificantLocationUpdates()` | 低功耗近似实现、独立通道 |
| 告警 | TC-WARN-01 | onWarning 展示 | `onWarning` 事件 | 负载结构 `{message,type}` 与展示上限 |
| 字段 | TC-FIELD-01 | Location 字段 | `Location` 接口 12 字段 | 10 产出字段核验 + 2 不产出字段不报错 |

---

## 3. 权限模块(TC-PERM)

> **背景知识:前台档 vs 始终档(含后台)**
>
> 原库采用 iOS 两段式权限模型,区别在于 **App 退到后台/锁屏后还能不能继续定位**:
>
> | 档位 | Demo 按钮 | 鸿蒙申请流程 | 成功后状态 | 设备行为 |
> |---|---|---|---|---|
> | 前台(whenInUse) | 申请权限(前台) | 一次申请 LOCATION + APPROXIMATELY_LOCATION(2 项) | `authorizedFine` | App 切后台后定位回调**停止** |
> | 始终(always) | 申请权限(含后台) | **两步串行**:①先申请前台 2 项 → ②授权成功后**单独**申请 LOCATION_IN_BACKGROUND | `authorizedAlways` | App 切后台/锁屏后回调**继续**(跑步轨迹、行车导航等场景) |
>
> **"含后台"= 在前台权限基础上,额外申请后台定位权限。** 鸿蒙限制:后台定位权限**不能与前台权限合并到同一次申请**(合并可能导致整单被拒),适配层已按「先前台、后后台」两步实现。
>
> **⚠️ 运行时弹窗永远给不了「始终允许」**:实测系统弹窗只有三个选项——**「本次使用允许」「仅使用期间允许」「不允许」**,没有任何后台/始终选项。即:**后台定位只能由用户手动到 设置 → 权限 → 位置信息 中选「始终允许」**,任何代码交互(包括本库的申请)都无法直接授予。这与原库 iOS 语义一致(iOS 申请 always 时用户也可能只给 whenInUse,Promise 返回 false,需引导用户去设置)。鸿蒙上 `requestPermission({ios:'always'})` 在用户未手动开启「始终允许」时返回 `false` 属**预期行为**,不是缺陷。
>
> **如何确认后台权限是否已授予**:① Demo「刷新状态」→ `authorizedAlways` = 有后台 / `authorizedFine` = 仅前台;② `hdc shell atm dump -t -b com.example.application` 看 `LOCATION_IN_BACKGROUND` 的 `grantStatus`(0=已授予,-1=未授予);③ 设置页「始终允许」选中状态。
>
> 另:**仅获得后台权限不保证后台可运行**——App 退后台后可能被系统挂起,业务需自行申请长时任务(`continuousTask`,定位导航类型),申请后通知栏出现常驻提示。

### TC-PERM-01 申请权限(前台档)

- **对应接口/属性**:`requestPermission({ ios: 'whenInUse' })`(联动核对 `getCurrentPermission` / `checkPermission`)
- **测什么**:鸿蒙映射为 `ohos.permission.LOCATION` + `ohos.permission.APPROXIMATELY_LOCATION` 组合弹窗;返回值 boolean 语义。
- **怎么测**:
  1. 全新安装(未授权过),点 **「申请权限(前台)」**;
  2. 系统弹权限窗 → 点「允许」;
  3. 观察状态文案与下方 `getCurrentPermission` / `checkPermission` 数值。
- **预期**:弹窗出现;允许后显示 `request whenInUse → true`;`getCurrentPermission: authorizedFine`;`checkPermission whenInUse: true / always: false`(未申请后台档)。
- **补充验证**:弹窗点「拒绝」→ 返回 `false` 且状态为 `denied`;**再次点击不应再弹窗**(鸿蒙拒绝后系统不再拉起,返回 false 属预期)。

### TC-PERM-02 申请权限(含后台档)

- **对应接口/属性**:`requestPermission({ ios: 'always' })`(内部两步串行:前台组合 → 单独申请 `LOCATION_IN_BACKGROUND`)
- **测什么**:「先前台、后后台」的两步申请顺序;**验证运行时弹窗无法授予后台**(鸿蒙交互限制,与 iOS 语义一致)。
- **怎么测**:
  1. 全新安装,点 **「申请权限(含后台)」** → 弹窗应只有三个选项:**「本次使用允许」「仅使用期间允许」「不允许」**(没有「始终允许」);
  2. 选「仅使用期间允许」→ 前台授权成功,第二步(后台权限)不弹窗;
  3. 回 Demo 看返回值与「刷新状态」。
- **预期**:返回 `false`、状态 `authorizedFine`(仅前台)——**这是预期行为,不是缺陷**(弹窗给不了「始终允许」,与 iOS 申请 always 被降级为 whenInUse 同语义);
- **完整后台授权路径(手动)**:到 **设置 → 应用 → 权限 → 位置信息** 选「始终允许」→ 回 Demo 点「刷新状态」→ 变为 `authorizedAlways`,且「权限变化事件」列表实时新增(联动 TC-PERM-06);此时再点「申请权限(含后台)」→ 返回 `true`。
- **反向验证**:第一步弹窗点「不允许」→ 不出现第二步弹窗,返回 `false`,状态 `denied`。
- **说明**:后台定位的业务要真正在后台持续运行,还需应用自行申请长时任务(`continuousTask`,定位导航类型)——这是业务层职责,不在本库范围内;Demo 未申请长时任务,故切后台后回调停止属预期。

### TC-PERM-03 android.fine 风格申请

- **对应接口/属性**:`requestPermission({ android: { detail: 'fine' } })`
- **测什么**:在鸿蒙分支同样映射到前台组合申请(JS 侧 harmony case 路由验证)。
- **怎么测**:已授权状态下点 **「android.fine 风格」**(不再弹窗,直接查 token)。
- **预期**:返回 `true`(已授权时);未授权时弹窗、结果同 TC-PERM-01。

### TC-PERM-04 android.coarse 风格申请

- **对应接口/属性**:`requestPermission({ android: { detail: 'coarse' } })`
- **测什么**:`detail: 'coarse'` 档位判断(鸿蒙端 authorizedFine/authorizedCoarse 均算通过)。注:Android 端的 `rationale` 字段鸿蒙忽略、无效果,demo 不再传入(README 支持矩阵已标注)。
- **怎么测**:点 **「android.coarse 风格」**。
- **预期**:已授权时直接返回 `true`。仅模糊权限(authorizedCoarse)场景下也返回 `true`(与 Android 分支 coarse 语义一致)。

### TC-PERM-05 查询与校验(getCurrentPermission / checkPermission)

- **对应接口/属性**:`getCurrentPermission()`;`checkPermission({ ios: 'whenInUse' })`;`checkPermission({ ios: 'always' })`
- **测什么**:状态查询与三档校验逻辑。
- **怎么测**:点 **「刷新状态」**,按 §5.2 状态映射表核对每行显示。
- **预期**:`getCurrentPermission` 值 ∈ 7 个枚举值且与系统设置一致;`whenInUse` 档在 authorizedFine/authorizedAlways 时为 true;`always` 档仅 authorizedAlways 时为 true。

### TC-PERM-06 权限变化事件(subscribeToPermissionUpdates)

- **对应接口/属性**:`subscribeToPermissionUpdates(listener)`(底层 `authorizationStatusDidChange` 事件)
- **测什么**:权限状态变化事件链路(原生 trackStatusChange → JS 订阅回调)。
- **怎么测**:保持 Demo 在前台,去 **设置 → 应用 → com.example.application → 权限 → 位置信息**,在「仅允许前面/始终允许/禁止」间切换后返回 Demo。
- **预期**:「权限变化事件」列表新增一条,值与设置中改的状态一致(注意:App 切后台时部分系统会杀进程,若列表无记录且 App 重启了属平台行为,重进后手动「刷新状态」核对)。

---

## 4. configure 模块(TC-CFG)——鸿蒙端消费属性全覆盖

> 对应接口:`configure(options: ConfigureOptions)`。
> configure 语义:多次调用只改传入项;原生端配置变更后**运行中的订阅按新参数重启**(对齐 Android 行为)。
>
> **验证手段(两种,推荐①)**:
> ① **日志验证(权威)**:点任意配置按钮后执行 `hdc shell hilog -x | grep RNLocation`,原生日志打印两行——`configure effective: ...`(合并后的生效参数)与 `startLocationListening LocationRequest=...`(实际传给系统的请求,`timeInterval` 为换算后的秒值),逐字段核对即完成验证,无需肉眼估计频率;
> ② **界面验证**:持续定位卡片的「回调间隔(近5次)」直接显示回调时间差,验证 interval 效果无需工具;distanceFilter 需配合实际位移观察(位移 < distanceFilter 时不回调)。

| 编号 | 按钮 | 对应属性 | 测什么 | 怎么测/预期 |
|---|---|---|---|---|
| TC-CFG-01 | 高精度+5m | `distanceFilter:5` + `interval:1000` + `desiredAccuracy.android:'highAccuracy'` | 高精度映射(→ACCURACY)+ 距离/时间过滤 | 点按钮后开始持续定位,移动 5m 以上才回调;标题旁显示 `highAccuracy / 5m / 1s ✓`;回调间隔明显变短 |
| TC-CFG-02 | 低功耗+100m | `distanceFilter:100` + `desiredAccuracy.android:'lowPower'` | LOW_POWER 映射(纯网络定位) | 室内也能出位置(网络定位);位移 <100m 不回调 |
| TC-CFG-03 | headingFilter 10° | `headingFilter:10` | 航向角度阈值 | 配合 TC-HDG-01:转动手机,角度变化 <10° 时航向不刷新,>10° 才刷新 |
| TC-CFG-04 | 恢复默认 | `configure({})` | 只改传入项语义 + 默认值回读 | 原生默认 distanceFilter=100m;标题显示 `默认配置 ✓`,无异常 |
| TC-CFG-05 | fastestInterval/maxWaitTime | `fastestInterval:5000` + `maxWaitTime:20000` | 三者取最小正值换算鸿蒙 `timeInterval`(秒) | interval 未传 → 生效 5s;回调间隔 ≈5s(系统下限 1s/20s 内属正常) |
| TC-CFG-06 | balancedPower/noPower | `desiredAccuracy.android:'balancedPowerAccuracy'` | 第 3/4 取值档 → LOW_POWER 映射 | 点击无告警(合法值);持续定位出网络定位结果 |

> 注:iOS 专属 6 项与 `androidProvider` 在鸿蒙端静默忽略、无效果,demo 不设按钮(原 TC-CFG-07/08 已移除);支持矩阵见 README。

---

## 5. 持续定位模块(TC-LOC)

### TC-LOC-01 订阅/退订与负载结构

- **对应接口/属性**:`subscribeToLocationUpdates(listener)`;返回值 `Subscription`(退订函数);`locationUpdated` 事件(负载 `Location[]`);`getLastLocation()` 立即回报行为
- **测什么**:订阅全链路(TurboModule → 事件 → JS 数组负载)与资源释放。
- **怎么测**:点 **「开始订阅」**,等待回调(首次 GNSS 冷启动可能 1~2 分钟),观察字段区与计数器;再点 **「停止订阅」**。
- **预期**:
  - 计数器递增;字段区展示 10 个字段(见 TC-FIELD-01);
  - 退订后计数不再增长(原生 `geoLocationManager.off` 生效);
  - `getLastLocation()` 立即回报:开始订阅后 **1~2 秒内**即出现一条(可能是历史位置,对齐 Android getLastKnownLocation 行为)。

### TC-LOC-02 配置联动频率

- **对应接口/属性**:`configure()` 与 `subscribeToLocationUpdates()` 的联动(configure 后运行中订阅按新参数重启)
- **测什么**:配置参数对订阅的实际生效。
- **怎么测**:TC-CFG-01(5m/1s/高精度)下户外走路观察;切换 TC-CFG-02(100m/低功耗)对比。
- **预期**:高频配置回调密集,低功耗配置稀疏且室内可用。

### TC-LOC-03 无权限订阅 → 403 告警

- **对应接口/属性**:`subscribeToLocationUpdates()` + `onWarning` 事件(type=403)
- **测什么**:权限缺失时原生错误映射(鸿蒙 201 → 库语义 403)。
- **怎么测**:设置中把 App 位置权限改为「禁止」→ 回 Demo 点「开始订阅」。
- **预期**:「onWarning 原生告警」区出现 `[403] Attempted to location updates without location permissions...`;App 不崩溃。

### TC-LOC-04 位置总开关关闭 → 开关告警

- **对应接口/属性**:`onWarning` 事件(type=500,鸿蒙 3301100 映射)
- **测什么**:系统位置开关关闭的错误映射。
- **怎么测**:关闭系统「位置信息」总开关 → 订阅中等待或重新订阅。
- **预期**:收到 `[500] The location switch is off during location updates.`;开回开关后恢复回调。

---

## 6. 单次定位模块(TC-GLL)

> 对应接口:`getLatestLocation(options: GetLatestLocationOptions)`

| 编号 | 按钮 | 对应参数形态 | 测什么 | 怎么测/预期 |
|---|---|---|---|---|
| TC-GLL-01 | 获取(15s 超时) | `getLatestLocation({ timeout: 15000 })` | 显式超时;订阅→取最新→退订 的封装逻辑 | 点击后「获取中…」,一般 1~15s 内返回最新位置并展示 10 字段 |
| TC-GLL-02 | timeout:null | `getLatestLocation({ timeout: null })` | 不设超时,等到首个位置才 resolve | 无权限/开关关闭时会一直等待(文案保持「获取中」);恢复条件后返回位置。**验证完记得等返回或重新订阅,避免挂起** |
| TC-GLL-03 | 缺省超时(10s) | `getLatestLocation()`(不传参) | 库默认 10s 超时 | 超时后显示 `null(超时未获取到位置)`,Promise 正常 resolve 非 reject |
| TC-GLL-04 | 超时路径 | 同上(极限条件) | 超时返回 `null` 的 UI 呈现 | 飞行模式+关闭位置开关后点 TC-GLL-01/03,15s/10s 后精确出现 `null(超时未获取到位置)` |

---

## 7. 航向模块(TC-HDG)

| 编号 | 对应接口/属性 | 测什么 | 怎么测/预期 |
|---|---|---|---|
| TC-HDG-01 | `subscribeToHeadingUpdates(listener)`;`headingUpdated` 事件;`Heading.heading` | 方向传感器全链路(ORIENTATION → alpha → `{heading}`) | 点「开始订阅」,平持手机原地旋转:heading 值 0~360 连续变化,北=0/东=90 与指南针一致;计数器递增;退订后停止 |
| TC-HDG-02 | `configure({ headingFilter })` × `subscribeToHeadingUpdates()` | 航向阈值过滤(含 0/360 环形差值处理) | 先点 TC-CFG-03(10°)再订阅航向:小幅转动(<10°)不刷新,大幅转动立即刷新;在正北附近来回转验证跨界 |
| TC-HDG-03 | `subscribeToHeadingUpdates()` + `onWarning`(type=502) | 无传感器设备降级 | **仅模拟器**:点「开始订阅」→ 不崩溃,告警区出现 `[502] Failed to start updating heading...`(真机有传感器,不适用) |

---

## 8. 显著位置变化(TC-SIG-01)

- **对应接口/属性**:`subscribeToSignificantLocationUpdates(listener)`(底层为独立 LOW_POWER 定位请求,`distanceInterval:1000m`)
- **测什么**:鸿蒙近似实现(低功耗网络定位 + 1000m 距离间隔,不受用户 configure 的 distanceFilter 影响)。
- **怎么测**:点「开始订阅」;在市内移动(基站/WiFi 切换级别,~1km 量级)后回看;同时保持 TC-LOC-01 订阅做对照。
- **预期**:
  - 显著回调计数独立增长;两条通道互不干扰;
  - 回调粒度远粗于持续定位(约公里级),两条 `说明` 文案已注明与 iOS 语义差异;
  - 无权限时同样走 403 告警(错误处理与主通道一致)。

---

## 9. onWarning 展示区(TC-WARN-01)

- **对应接口/属性**:`onWarning` 事件(负载 `{ message: string, type: string }`)
- **测什么**:告警事件负载结构与展示上限。
- **怎么测**:任意触发告警的用例(TC-LOC-03/04、TC-HDG-03)后查看「onWarning 原生告警」区。
- **预期**:每条格式 `[错误码] message`,最新在上,最多保留 8 条;错误码含义见 §5.3。

---

## 10. Location 字段核验(TC-FIELD-01)

- **对应接口/属性**:`Location` 接口全部 12 个字段(经 `locationUpdated` 事件负载/`getLatestLocation` 返回值呈现)
- **测什么**:事件负载数组内对象字段与 2.5.0 `Location` 接口的对齐度。
- **怎么测**:任一次定位回调后逐行核对:

| 字段 | 核验点 |
|---|---|
| `timestamp` | number(UTC 毫秒);格式化时间与当前时间差在合理范围(**历史位置**可能较早——首条 getLastLocation 回报属预期) |
| `latitude` / `longitude` | 与实际位置比对(误差与 accuracy 同量级) |
| `accuracy` | 正数,单位米;室内网络定位通常 20~100m,GNSS 5~30m |
| `altitude` / `altitudeAccuracy` | 海拔米数;altitudeAccuracy 可为 0(鸿蒙缺省) |
| `course` | 0~360 运动方向;静止时可能为 0 |
| `courseAccuracy` / `speedAccuracy` | 可为 0(鸿蒙缺省填充,字段不缺失) |
| `speed` | m/s;步行约 1~1.5 |
| (不产出)`floor` / `fromMockProvider` | 鸿蒙无对应能力,负载中不出现——**验证 demo 不因字段缺失报 undefined 错误** |

---

## 5. 附录

### 5.1 权限重置方法(用例间恢复初始态)

- **设置 → 应用 → com.example.application → 权限 → 位置信息 → 禁止**;
- 注意:鸿蒙在用户「拒绝」过一次后,应用内再调用申请**不会再弹窗**(系统限制),必须到设置中手动改——这正是 TC-PERM-01 补充验证与 TC-PERM-06 的前置知识;
- 完全重置:卸载重装 App(`hdc shell bm uninstall -n com.example.application`)。

### 5.2 权限状态映射表(鸿蒙 → 库枚举)

对应接口:`getCurrentPermission()` 返回值 `LocationPermissionStatus`;`checkPermission()` 两档校验。

| 系统权限状态 | `getCurrentPermission` 返回 | whenInUse 档 | always 档 |
|---|---|---|---|
| 精确+模糊+后台 | `authorizedAlways` | true | true |
| 精确+模糊(前台) | `authorizedFine` | true | false |
| 仅模糊 | `authorizedCoarse` | false(coarse 档 true) | false |
| 禁止/从未申请 | `denied` | false | false |
| 查询异常 | `restricted` | false | false |

> 鸿蒙 token 层无法区分「从未申请」与「用户拒绝」,统一返回 `denied`(README 已注明)。

### 5.3 告警码对照表(onWarning type)

对应接口:`onWarning` 事件的 `type` 字段取值。

| 错误码 | 含义 | 触发用例 |
|---|---|---|
| 401 | 参数错误(distanceFilter 非法等) | —(构造非法入参时) |
| 403 | 无定位权限(鸿蒙 201 映射) | TC-LOC-03 |
| 500 | 定位服务异常;含总开关关闭(3301100)/服务不可用(3301000) | TC-LOC-04 |
| 502 | 航向传感器不可用(模拟器) | TC-HDG-03 |

### 5.4 已知平台差异(测试判定依据)

1. `locationUpdated` 负载为 **Location[] 数组**(JS 侧排序取最新),与原库一致;
2. 开始订阅时先回报 `getLastLocation()` **历史位置**(对齐 Android getLastKnownLocation),不要误判为实时位置;
3. significant 为低功耗近似(公里级),粒度与 iOS 不等价;
4. heading 为方向传感器 alpha 角(0-360 绕 Z 轴),非 CLHeading 的 trueHeading;
5. `interval/fastestInterval/maxWaitTime` 毫秒 → 鸿蒙 `timeInterval` 秒,系统下限 GNSS 1s / 网络定位 20s,低于下限时按下限生效;
6. iOS 专属 configure 项与 `androidProvider` 静默忽略,不产生 401 告警(demo 未设按钮,支持矩阵见 README)。
