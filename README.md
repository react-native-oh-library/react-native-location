> 文档模板：v0.4.2

<p align="center">
<h1 align="center"> <code>react-native-location</code> </h1>
 </p>

本项目基于 [react-native-location](https://github.com/timfpark/react-native-location) 开发，为 React Native 鸿蒙（OpenHarmony/HarmonyOS）适配版本。

该三方库适配后支持直接从 npm 下载，新的包名为：`@react-native-ohos/react-native-location`，版本所属关系如下：

| 三方库名称 | 三方库版本（npm地址） | 发布信息 | 支持RN版本 | Autolink | 编译API版本 | 社区基线版本 | 源码地址 |
| ------------ | ------------ | ------------------------------ | ------------- | ------------- |------------------------ | ------------- | ------------- |
| @react-native-ohos/react-native-location | [1.0.0-beta.1](https://www.npmjs.com/package/@react-native-ohos/react-native-location) | 见发布记录 | 0.72.* | 是 | API12+ | 2.5.0 | [master](https://github.com/timfpark/react-native-location) |

## 简介

react-native-location 为 React Native 应用提供原生 GPS 定位能力，封装了 iOS `CLLocationManager` 与 Android `FusedLocationProvider`/标准定位服务，并提供跨平台的权限管理 API。

鸿蒙适配版本基于下列系统能力实现，API 面与原库 2.5.0 对齐（以 TurboModule + RNOH codegen 实现）：

- 定位：`@kit.LocationKit` 的 `geoLocationManager`（持续定位 `on/off('locationChange')`、`getLastLocation` 最后已知位置）
- 航向：`@kit.SensorServiceKit` 的方向传感器（`SensorId.ORIENTATION`）
- 权限：`@kit.AbilityKit` 的 `abilityAccessCtrl`（动态申请与状态查询）

## 下载安装

进入到工程目录并输入以下命令：

#### **npm**

```bash
npm install @react-native-ohos/react-native-location
```

#### **yarn**

```bash
yarn add @react-native-ohos/react-native-location
```

## Link

|  | 是否支持autolink | RN框架版本 |
|--------------------------------------|-----------------|------------|
| 1.0.0-beta.1 | Yes | 0.72 |

使用AutoLink的工程需要根据该文档配置，Autolink框架指导文档：https://gitcode.com/CPF-RN/ohos_react_native/blob/master/docs/zh-cn/Autolinking.md

如您使用的版本支持 Autolink，并且工程已接入 Autolink，可跳过ManualLink配置。

<details>
  <summary>ManualLink: 此步骤为手动配置原生依赖项的指导</summary>

首先需要使用 DevEco Studio 打开项目里的 HarmonyOS 工程 `harmony`。

### 1. Overrides RN SDK

为了让工程依赖同一个版本的 RN SDK，需要在工程根目录的 `oh-package.json5` 添加 overrides 字段，指向工程需要使用的 RN SDK 版本。替换的版本既可以是一个具体的版本号，也可以是一个模糊版本，还可以是本地存在的 HAR 包或源码目录。

关于该字段的作用请阅读[官方说明](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/ide-oh-package-json5-V5#zh-cn_topic_0000001792256137_overrides)

```json
{
  "overrides": {
    "@rnoh/react-native-openharmony": "file:../node_modules/@react-native-oh/react-native-harmony/react_native_openharmony_release.har"
  }
}
```

### 2. 引入原生端代码

> [!TIP] har 包位于三方库安装路径的 `harmony` 文件夹下。

打开 `entry/oh-package.json5`，添加以下依赖：

```json
"dependencies": {
    "@react-native-ohos/react-native-location": "file:../../node_modules/@react-native-ohos/react-native-location/harmony/location.har"
  }
```

点击右上角的 `sync` 按钮

或者在终端执行：

```bash
cd entry
ohpm install
```

### 3. 配置 CMakeLists

打开 `entry/src/main/cpp/CMakeLists.txt`，添加：

```cmake
set(OH_MODULES "${CMAKE_CURRENT_SOURCE_DIR}/../../../oh_modules")

add_subdirectory("${OH_MODULES}/@react-native-ohos/react-native-location/src/main/cpp" ./location)

target_link_libraries(rnoh_app PUBLIC location)
```

### 4. 注册 Package（C++ 侧）

打开 `entry/src/main/cpp/PackageProvider.cpp`，添加：

```cpp
#include "LocationPackage.h"

std::vector<std::shared_ptr<Package>> PackageProvider::getPackages(Package::Context ctx) {
    return {
        std::make_shared<LocationPackage>(ctx),
    };
}
```

### 5. 注册 Package（ETS 侧）

打开 `entry/src/main/ets/RNPackagesFactory.ets`，添加：

```typescript
import { LocationPackage } from '@react-native-ohos/react-native-location/ts';

export function createRNPackages(ctx: RNPackageContext): RNPackage[] {
  return [
    new LocationPackage(ctx),
  ];
}
```

</details>

### 权限配置（必做）

在宿主工程 `entry/src/main/module.json5` 的 `module` 中声明定位权限（user_grant，运行时经 `requestPermission` 动态申请）：

```json
"requestPermissions": [
  { "name": "ohos.permission.LOCATION", "reason": "$string:location_reason", "usedScene": { "abilities": ["EntryAbility"], "when": "inuse" } },
  { "name": "ohos.permission.APPROXIMATELY_LOCATION", "reason": "$string:location_reason", "usedScene": { "abilities": ["EntryAbility"], "when": "inuse" } },
  { "name": "ohos.permission.LOCATION_IN_BACKGROUND", "reason": "$string:location_reason", "usedScene": { "abilities": ["EntryAbility"], "when": "always" } }
]
```

> [!TIP] 前台定位需 `LOCATION` + `APPROXIMATELY_LOCATION` 两项；仅后台定位场景需要 `LOCATION_IN_BACKGROUND`。同时在 `string.json` 中补齐 `location_reason` 文案。

### 运行

点击右上角的 `sync` 按钮

或者在命令行终端执行：

```bash
cd entry
ohpm install
```

然后编译、运行即可。

## 约束与限制

### 兼容性

本文档内容基于以下版本验证通过：
1. RNOH: 0.72.139; SDK: HarmonyOS 5.0.1 Release SDK (API13, targetSdk 6.0.1(21)); IDE: DevEco Studio 6.0.1 Release; ROM: 6.0.0 真机;

### 使用限制

- 真机需开启系统「位置信息」总开关；开关关闭时定位请求报 3301100，映射为 `onWarning`（type 500）
- 鸿蒙 GNSS 定位最小时间间隔 1 秒、网络定位最小 20 秒，`interval/fastestInterval/maxWaitTime` 低于最小值时按系统最小值生效
- **后台定位申请顺序**（鸿蒙限制）：`LOCATION_IN_BACKGROUND` 不能与前台定位权限合并到同一次申请——适配层采用两步串行：先申请前台组合（LOCATION + APPROXIMATELY_LOCATION），授权成功后再单独申请后台权限；运行时弹窗仅有「本次使用允许/仅使用期间允许/不允许」三个选项，**「始终允许」只能由用户在系统设置中手动开启**（后台定位的唯一授予路径）
- **验证后台权限是否已授予**：`getCurrentPermission()` 返回 `authorizedAlways` 即含后台；也可用命令 `hdc shell atm dump -t -b <bundleName>` 查看 `LOCATION_IN_BACKGROUND` 的 `grantStatus`（0=已授予，-1=未授予）
- **后台持续定位还需长时任务**：仅获得后台定位权限不足以保证后台运行，应用退后台后可能被系统挂起。需后台定位的业务应自行申请长时任务（`continuousTask`，定位导航类型），申请后通知栏会显示常驻提示

## 使用示例
下面的代码展示了这个库的基本使用场景：

> [!WARNING] 使用时 import 的库名不变（使用 `react-native-location`，由 RNOH alias 自动映射到鸿蒙适配包）。

#### 基本使用（配置 → 权限 → 持续订阅）

```tsx
import React, { useEffect } from 'react';
import { Text, Button, View } from 'react-native';
import RNLocation, { Location, LocationPermissionStatus } from 'react-native-location';

export function locationTest() {
  let unsub: (() => void) | null = null;

  async function start() {
    // 1. 配置定位参数（可多次调用，只改传入项）
    await RNLocation.configure({
      distanceFilter: 5,                                // 米
      interval: 10000,                                  // 毫秒
      desiredAccuracy: { android: 'highAccuracy' },     // 鸿蒙映射为精度优先
    });

    // 2. 申请权限（whenInUse 档 = 前台组合权限；always 档另含后台定位）
    const granted = await RNLocation.requestPermission({
      ios: 'whenInUse',
      android: { detail: 'fine' },
    });

    // 3. 持续订阅位置更新（负载为 Location[] 数组，取最新一条）
    if (granted) {
      unsub = RNLocation.subscribeToLocationUpdates((locations: Location[]) => {
        const latest = locations[0];
        console.log(latest.latitude, latest.longitude, latest.accuracy);
      });
    }
  }

  function stop() {
    unsub?.(); // 退订并释放原生定位资源
  }

  return (
    <View>
      <Button title="start location" onPress={start} />
      <Button title="stop location" onPress={stop} />
    </View>
  );
}
```

#### 单次获取最新位置

```js
import RNLocation from 'react-native-location';

// 超时（默认 10s，可配）未获取到位置时 resolve 为 null
const location = await RNLocation.getLatestLocation({ timeout: 15000 });
if (location) {
  console.log(location.timestamp, location.latitude, location.longitude);
}
```

#### 权限状态查询与订阅

```js
import RNLocation from 'react-native-location';

const status = await RNLocation.getCurrentPermission();          // 'authorizedFine' 等
const ok = await RNLocation.checkPermission({ ios: 'always' }); // 校验权限档位

const unsubscribe = RNLocation.subscribeToPermissionUpdates((status) => {
  console.log('permission changed:', status); // authorizationStatusDidChange 事件
});
// unsubscribe() 取消订阅
```

#### 航向与显著位置变化

```js
import RNLocation from 'react-native-location';

// 航向：方向传感器 alpha 角（0-360，绕 Z 轴），headingFilter 为角度阈值
await RNLocation.configure({ headingFilter: 10 });
const unsubHeading = RNLocation.subscribeToHeadingUpdates((h) => {
  console.log('heading:', h.heading);
});

// 显著位置变化：鸿蒙以低功耗网络定位 + 1000m 距离间隔的独立请求近似实现
const unsubSig = RNLocation.subscribeToSignificantLocationUpdates((locations) => {
  console.log('significant:', locations[0]);
});
```

## 接口说明

> [!TIP] "Platform"列表示该属性在原三方库上支持的平台。

> [!TIP] "HarmonyOS平台支持"列为 Yes 表示 HarmonyOS平台支持该属性；No 则表示不支持（静默忽略或不产出）；partially 表示部分支持。使用方法跨平台一致，效果对标 iOS 或 Android 的效果。

### API
| 名称 | 类型 | 参数类型 | 返回值 | 必填 | 平台 | HarmonyOS平台支持 | 描述 |
|--------|---------|-----|-------|-------|--------|-----|-----------------|
| configure | function | options: ConfigureOptions | Promise\<void\> | Yes | iOS/Android | Yes | 配置定位参数，可多次调用只改传入项；配置后运行中的订阅按新参数重启。iOS 专属项与 androidProvider 在鸿蒙端静默忽略，Promise 永远 resolve |
| requestPermission | function | options: RequestPermissionOptions | Promise\<boolean\> | Yes | iOS/Android | partially | 申请定位权限。鸿蒙映射（两步串行）：第一步申请 LOCATION+APPROXIMATELY_LOCATION；`always` 档在前台授权成功后再单独申请 LOCATION_IN_BACKGROUND（鸿蒙限制：后台定位权限不可与前台权限合并申请）。**注意**：运行时弹窗仅有「本次使用允许/仅使用期间允许/不允许」三个选项，「始终允许」只能由用户在系统设置中手动开启（与 iOS 申请 always 被降级为 whenInUse 的语义一致），未开启时 `always` 档返回 `false` 属预期 |
| checkPermission | function | options: RequestPermissionOptions | Promise\<boolean\> | No | iOS/Android | Yes | 校验当前权限是否满足指定档位（fine/coarse/whenInUse/always） |
| getCurrentPermission | function | / | Promise\<LocationPermissionStatus\> | No | iOS/Android | partially | 查询当前权限状态。鸿蒙 token 层无法区分「从未申请」与「用户拒绝」，未授权时统一返回 `denied` |
| subscribeToPermissionUpdates | function | listener: (status: LocationPermissionStatus) => void | Subscription | No | iOS/Android | partially | 订阅权限状态变化。鸿蒙无系统级权限变更推送，事件在每次权限查询/申请后经去重比较发射 |
| subscribeToLocationUpdates | function | listener: (locations: Location[]) => void | Subscription | Yes | iOS/Android | Yes | 持续订阅位置更新；开始订阅时会先回报 `getLastLocation()` 最后已知位置（对齐 Android 行为） |
| getLatestLocation | function | options?: GetLatestLocationOptions | Promise\<Location \| null\> | No | iOS/Android | Yes | 单次获取最新位置，超时 resolve 为 `null`（默认 10s，`timeout: null` 表示不超时） |
| subscribeToHeadingUpdates | function | listener: (heading: Heading) => void | Subscription | No | iOS | partially | 订阅航向变化。鸿蒙以方向传感器 alpha 角（0-360，绕 Z 轴）近似 CLHeading，无 trueHeading/magneticHeading 之分 |
| subscribeToSignificantLocationUpdates | function | listener: (locations: Location[]) => void | Subscription | No | iOS | partially | 订阅显著位置变化。鸿蒙无对应原生 API，以低功耗（LOW_POWER）+1000m 距离间隔的独立定位请求近似，不受 configure 的 distanceFilter 影响 |

> 返回值 `Subscription` 为退订函数 `() => void`，调用即解除订阅并释放原生资源。

### 事件
| 名称 | 负载类型 | 平台 | HarmonyOS平台支持 | 描述 |
|---|---|---|---|---|
| locationUpdated | Location[] | iOS, Android | Yes | 位置更新事件，负载为数组（JS 侧按 timestamp 排序取最新） |
| headingUpdated | { heading: number } | iOS | Yes | 航向更新事件 |
| authorizationStatusDidChange | LocationPermissionStatus | iOS | Yes | 权限状态变化事件 |
| onWarning | { message: string, type: string } | iOS, Android | Yes | 原生告警事件。type 沿用 Android 错误码语义：401 参数错误 / 403 无权限（鸿蒙 201 映射）/ 500 定位服务异常（含总开关关闭 3301100）/ 502 航向传感器不可用 |

---

### ConfigureOptions
| 名称 | 参数类型 | 默认值 | 必填 | 平台 | HarmonyOS平台支持 | 描述 |
|---|---|---|---|---|---|---|
| distanceFilter | number \| void | 100 | No | iOS, Android | Yes | 触发位置更新回调的最小距离变化（米）。鸿蒙映射为 `distanceInterval` |
| interval | number \| void | / | No | Android | Yes | 主动定位的期望间隔（毫秒）。鸿蒙映射为 `timeInterval`（秒），与 fastestInterval/maxWaitTime 取三者最小正值 |
| fastestInterval | number \| void | / | No | Android | Yes | 最快更新间隔（毫秒）。鸿蒙端与 interval 合并换算，无独立对应 |
| maxWaitTime | number \| void | / | No | Android | Yes | 位置更新最大等待时间（毫秒）。鸿蒙端与 interval 合并换算，无独立对应 |
| desiredAccuracy.ios | LocationAccuracyIOS \| void | / | No | iOS | No | iOS 定位精度档位，鸿蒙无对应，静默忽略 |
| desiredAccuracy.android | LocationPriorityAndroid \| void | / | No | Android | Yes | Android 功耗优先级。鸿蒙映射：`highAccuracy` → ACCURACY（精度优先）；`balancedPowerAccuracy`/`lowPower`/`noPower` → LOW_POWER（低功耗网络定位）；不传时默认 FIRST_FIX |
| activityType | LocationActivityType \| void | 'other' | No | iOS | No | 用户活动类型，鸿蒙无对应，静默忽略 |
| androidProvider | AndroidProvider \| void | 'auto' | No | Android | No | Android 定位 provider 选择（auto/playServices/standard），鸿蒙单一系统定位服务，静默忽略 |
| allowsBackgroundLocationUpdates | boolean \| void | false | No | iOS | No | iOS 后台定位开关。鸿蒙后台定位由 LOCATION_IN_BACKGROUND 权限控制，该配置静默忽略 |
| pausesLocationUpdatesAutomatically | boolean \| void | true | No | iOS | No | iOS 自动暂停定位，鸿蒙无对应，静默忽略 |
| showsBackgroundLocationIndicator | boolean \| void | false | No | iOS | No | iOS 后台定位指示器，鸿蒙无对应，静默忽略 |
| headingFilter | number \| void | 0 | No | iOS | Yes | 航向变化阈值（度），小于该值不触发回调；0 表示不过滤。鸿蒙端已实现（含 0/360 环形差值处理） |
| headingOrientation | HeadingOrientation \| void | 'portrait' | No | iOS | No | 航向参考设备方向，鸿蒙无对应，静默忽略 |

---

### RequestPermissionOptions
| 名称 | 参数类型 | 默认值 | 必填 | 平台 | HarmonyOS平台支持 | 描述 |
|---|---|---|---|---|---|---|
| ios | `'whenInUse' \| 'always' \| 'ignore' \| void` | / | No | iOS | Yes | iOS 权限档位。鸿蒙端：whenInUse → 前台组合权限；always → 前台组合 + 后台定位权限；ignore 跳过 |
| android | `{ detail: 'fine' \| 'coarse', rationale?: {...} } \| 'ignore' \| void` | / | No | Android | Yes | Android 权限档位与弹窗说明文案。鸿蒙端 detail 参与档位判定（fine 需 authorizedFine，coarse 接受 authorizedFine/authorizedCoarse）；rationale 为透传字段，鸿蒙端忽略 |

---

### GetLatestLocationOptions
| 名称 | 参数类型 | 默认值 | 必填 | 平台 | HarmonyOS平台支持 | 描述 |
|---|---|---|---|---|---|---|
| timeout | number \| null \| void | 10000 | No | iOS, Android | Yes | 超时毫秒数，超时 resolve 为 `null`；传 `null` 表示不设超时，一直等到首个位置 |

---

### Location
| 名称 | 参数类型 | 平台 | HarmonyOS平台支持 | 描述 |
|---|---|---|---|---|
| timestamp | number | iOS, Android | Yes | 位置时间戳（UTC 毫秒） |
| latitude | number | iOS, Android | Yes | 纬度 |
| longitude | number | iOS, Android | Yes | 经度 |
| accuracy | number | iOS, Android | Yes | 水平精度半径（米），对应鸿蒙 `accuracy` |
| altitude | number | iOS, Android | Yes | 海拔（米），对应鸿蒙 `altitude` |
| altitudeAccuracy | number | iOS, Android | Yes | 垂直精度（米），对应鸿蒙 `altitudeAccuracy`（API12+ 可选字段，缺省 0） |
| course | number | iOS, Android | Yes | 运动方向（度，0-360 正北基准），对应鸿蒙 `direction` |
| courseAccuracy | number | iOS, Android | Yes | 方向精度，对应鸿蒙 `directionAccuracy`（可选字段，缺省 0） |
| speed | number | iOS, Android | Yes | 瞬时速度（m/s），对应鸿蒙 `speed` |
| speedAccuracy | number | iOS, Android | Yes | 速度精度（m/s），对应鸿蒙 `speedAccuracy`（可选字段，缺省 0） |
| floor | number | iOS | No | 室内楼层，鸿蒙无对应，负载中不产出 |
| fromMockProvider | boolean | Android | No | 是否来自模拟位置，鸿蒙无对应语义，负载中不产出 |

---

### Heading
| 名称 | 参数类型 | 平台 | HarmonyOS平台支持 | 描述 |
|---|---|---|---|---|
| heading | number | iOS | Yes | 航向角（度，0-360，绕 Z 轴）。鸿蒙以方向传感器 `OrientationResponse.alpha` 近似，与罗盘方向一致（北 0 / 东 90） |

---

### LocationPermissionStatus
| 取值 | 平台 | HarmonyOS平台支持 | 描述 |
|---|---|---|---|
| authorizedAlways | iOS, Android | Yes | 精确+模糊+后台定位权限均已授权（LOCATION + APPROXIMATELY_LOCATION + LOCATION_IN_BACKGROUND） |
| authorizedWhenInUse | iOS | No | 鸿蒙无该中间态：前台精确权限返回 `authorizedFine` |
| authorizedFine | Android | Yes | 前台精确权限（LOCATION + APPROXIMATELY_LOCATION 均授权） |
| authorizedCoarse | Android | Yes | 仅模糊权限（仅 APPROXIMATELY_LOCATION 授权） |
| denied | iOS, Android | partially | 未授权。鸿蒙 token 层无法区分「从未申请」与「用户拒绝」，统一返回该值 |
| restricted | iOS, Android | Yes | 权限状态查询异常时返回 |
| notDetermined | iOS | No | 鸿蒙无法区分该状态（与 denied 合并），不返回 |

## 遗留问题
1. `AndroidProvider` 类型取值与官方 npm 2.5.0 包（`"auto" | "fused" | "builtin"`）存在命名差异（本包为 `"auto" | "playServices" | "standard"`，取自原库 GitHub master 分支命名）。该配置仅 Android 平台使用且鸿蒙端运行时忽略，不影响功能；如业务代码按官方 npm 2.5.0 类型传 `fused`/`builtin`，TS 编译会报错，属已知类型层差异。

## 其它
1. 模拟器无方向传感器/无 GNSS：订阅航向会收到 `onWarning`（502）降级不崩溃；定位无结果时 `getLatestLocation` 按超时返回 `null`。定位相关用例请优先在真机验证。
2. 开始订阅位置更新后的首条回调可能是 `getLastLocation()` 返回的历史位置（对齐 Android `getLastKnownLocation` 立即回报行为），非缺陷。

## 目录结构
```
/ohos-location              # 项目根目录
├── src/                    # RN JS 代码
│    └─ index.ts            # 入口文件（9 个公开 API）
│    └─ types.ts            # 类型定义（ConfigureOptions/Location 等）
│    └─ utils.ts            # 工具函数
│    └─ lib/                # nativeInterface / permissions / subscriptions
│    └─ specs/v1/           # TurboModule codegen 规范（NativeRNLocation.ts）
├── harmony/                # 鸿蒙适配代码
│    └─ location.har        # har 包
│    └─ location/           # 鸿蒙适配核心代码
│         └─ index.ets      # 鸿蒙适配代码入口
│         └─ src/main/ets/  # ArkTS 实现
│              └─ RNLocationTurboModule.ets        # 定位/航向/权限 TurboModule 实现
│              └─ LocationTurboModulesFactory.ets  # Package 注册
│              └─ generated/                       # codegen 生成代码
│         └─ src/main/cpp/  # C++ 侧注册
│              └─ LocationPackage.h
│              └─ generated/
├── dist/                   # JS 构建产物（commonjs/module/typescript）
├── example/                # 示例工程
│    └─ App.tsx             # Demo（覆盖全部 API 与配置项）
│    └─ TESTING.md          # 真机测试文档（28 用例）
│    └─ harmony/            # 鸿蒙示例工程
├── package.json
├── README.md               # 中文安装使用方法
└── README_en.md            # 英文安装使用方法
```

## 贡献代码

使用过程中发现任何问题都可以提交 [Issue](https://github.com/cbd1020819393/react-native-location/issues)，当然，也非常欢迎提交 [PR](https://github.com/cbd1020819393/react-native-location/pulls) 。

## 开源协议

本项目基于 [MIT License (MIT)](https://github.com/cbd1020819393/react-native-location/blob/master/LICENSE) ，请自由地享受和参与开源。
