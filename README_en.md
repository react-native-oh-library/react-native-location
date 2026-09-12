> Template version: v0.4.2

<p align="center">
<h1 align="center"> <code>react-native-location</code> </h1>
 </p>

This project is based on [react-native-location](https://github.com/timfpark/react-native-location) and is adapted for React Native on OpenHarmony/HarmonyOS.

The adapted third-party library supports direct download from npm under the new package name: `@react-native-ohos/react-native-location`. The version mapping is as follows:

| Name | Version(Npm Address) | Release Information | Supported RN Version | Supported Autolink | Compile API Version | Community Baseline Version | Source code address |
| --------------| -------------- | ------------------------------ | ------------- | ------------- |------------------------ | ------------- | ------------- |
| @react-native-ohos/react-native-location | [1.0.0-beta.1](https://www.npmjs.com/package/@react-native-ohos/react-native-location) | See release notes | 0.72.* | Yes | API12+ | 2.5.0 | [master](https://github.com/timfpark/react-native-location) |

## Introduction

react-native-location provides native GPS location capabilities for React Native apps. It wraps iOS `CLLocationManager` and Android `FusedLocationProvider`/standard location services, and offers cross-platform permission management APIs.

The HarmonyOS adaptation is implemented on top of the following system capabilities, with the API surface aligned to the original library 2.5.0 (implemented as a TurboModule via RNOH codegen):

- Location: `geoLocationManager` from `@kit.LocationKit` (continuous location via `on/off('locationChange')`, last known location via `getLastLocation`)
- Heading: orientation sensor (`SensorId.ORIENTATION`) from `@kit.SensorServiceKit`
- Permissions: `abilityAccessCtrl` from `@kit.AbilityKit` (dynamic requests and status queries)

## Installation and Usage

Go to the project directory and execute the following instruction:

#### **npm**

```bash
npm install @react-native-ohos/react-native-location
```

#### **yarn**

```bash
yarn add @react-native-ohos/react-native-location
```

## Link

|  | Supported Autolink | Supported RN Version |
|--------------------------------------|-----------------|------------|
| 1.0.0-beta.1 | Yes | 0.72 |

Projects using AutoLink need to be configured according to the Autolink framework guide: https://gitcode.com/CPF-RN/ohos_react_native/blob/master/docs/zh-cn/Autolinking.md

If the version you use supports Autolink and your project is already integrated with Autolink, you can skip the ManualLink configuration.

<details>
  <summary>ManualLink: Guidance for manually configuring native dependencies</summary>

First, open the HarmonyOS project `harmony` in the project directory with DevEco Studio.

### 1. Overrides RN SDK

To ensure the project depends on the same version of the RN SDK, add an `overrides` field to the `oh-package.json5` file in the project root directory, pointing to the RN SDK version the project needs to use. The replacement version can be a specific version number, a fuzzy version, a local HAR package, or a source code directory.

For details about this field, refer to the [official documentation](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides-V5/ide-oh-package-json5-V5#zh-cn_topic_0000001792256137_overrides)

```json
{
  "overrides": {
    "@rnoh/react-native-openharmony": "file:../node_modules/@react-native-oh/react-native-harmony/react_native_openharmony_release.har"
  }
}
```

### 2. Introducing Native Code

> [!TIP] The HAR package is located in the `harmony` folder of the third-party library installation path.

Open `entry/oh-package.json5` and add the following dependency:

```json
"dependencies": {
    "@react-native-ohos/react-native-location": "file:../../node_modules/@react-native-ohos/react-native-location/harmony/location.har"
  }
```

Click the `sync` button in the upper right corner,

or execute the following in the terminal:

```bash
cd entry
ohpm install
```

### 3. Configuring CMakeLists

Open `entry/src/main/cpp/CMakeLists.txt` and add:

```cmake
set(OH_MODULES "${CMAKE_CURRENT_SOURCE_DIR}/../../../oh_modules")

add_subdirectory("${OH_MODULES}/@react-native-ohos/react-native-location/src/main/cpp" ./location)

target_link_libraries(rnoh_app PUBLIC location)
```

### 4. Register the Package (C++ side)

Open `entry/src/main/cpp/PackageProvider.cpp` and add:

```cpp
#include "LocationPackage.h"

std::vector<std::shared_ptr<Package>> PackageProvider::getPackages(Package::Context ctx) {
    return {
        std::make_shared<LocationPackage>(ctx),
    };
}
```

### 5. Register the Package (ETS side)

Open `entry/src/main/ets/RNPackagesFactory.ets` and add:

```typescript
import { LocationPackage } from '@react-native-ohos/react-native-location/ts';

export function createRNPackages(ctx: RNPackageContext): RNPackage[] {
  return [
    new LocationPackage(ctx),
  ];
}
```

</details>

### Permission Configuration (Required)

Declare the location permissions in the `module` section of `entry/src/main/module.json5` of the host project (user_grant; requested at runtime via `requestPermission`):

```json
"requestPermissions": [
  { "name": "ohos.permission.LOCATION", "reason": "$string:location_reason", "usedScene": { "abilities": ["EntryAbility"], "when": "inuse" } },
  { "name": "ohos.permission.APPROXIMATELY_LOCATION", "reason": "$string:location_reason", "usedScene": { "abilities": ["EntryAbility"], "when": "inuse" } },
  { "name": "ohos.permission.LOCATION_IN_BACKGROUND", "reason": "$string:location_reason", "usedScene": { "abilities": ["EntryAbility"], "when": "always" } }
]
```

> [!TIP] Foreground location requires both `LOCATION` and `APPROXIMATELY_LOCATION`; `LOCATION_IN_BACKGROUND` is only needed for background location scenarios. Also add the `location_reason` string to `string.json`.

### Running

Click the `sync` button in the upper right corner,

or execute the following in the terminal:

```bash
cd entry
ohpm install
```

Then build and run.

## Constraints

### Compatibility

The content of this document has been verified with the following versions:
1. RNOH: 0.72.139; SDK: HarmonyOS 5.0.1 Release SDK (API13, targetSdk 6.0.1(21)); IDE: DevEco Studio 6.0.1 Release; ROM: 6.0.0 real device;

### Usage Restrictions

- The system "Location" master switch must be enabled on real devices. When the switch is off, location requests report error 3301100, which is mapped to `onWarning` (type 500)
- On HarmonyOS, the minimum time interval is 1s for GNSS and 20s for network positioning. If `interval/fastestInterval/maxWaitTime` are below the minimum, the system minimum takes effect
- **Background permission request order** (HarmonyOS restriction): `LOCATION_IN_BACKGROUND` cannot be combined with foreground location permissions in a single request — the adaptation requests them in two sequential steps: first the foreground set (LOCATION + APPROXIMATELY_LOCATION), then the background permission separately after the foreground grant succeeds. The runtime dialog only offers "Allow this time / Allow while in use / Don't allow" — **"Always allow" can only be enabled manually by the user in system Settings** (the only path to grant background location)
- **Verifying whether background location is granted**: `getCurrentPermission()` returning `authorizedAlways` means background is granted; alternatively use `hdc shell atm dump -t -b <bundleName>` and check the `grantStatus` of `LOCATION_IN_BACKGROUND` (0=granted, -1=not granted)
- **Background location also requires a continuous task**: holding the background location permission alone does not guarantee background execution — the app process may be suspended when backgrounded. Apps needing background location should request a continuous task (`continuousTask`, location/navigation type) themselves; a persistent notification is shown once requested

## Example
The following code demonstrates the basic usage of this library:

> [!WARNING] Keep the original library name when importing (use `react-native-location`; it is automatically mapped to the HarmonyOS adapted package via the RNOH alias).

#### Basic usage (configure → permission → continuous subscription)

```tsx
import React from 'react';
import { Button, View } from 'react-native';
import RNLocation, { Location } from 'react-native-location';

export function locationTest() {
  let unsub: (() => void) | null = null;

  async function start() {
    // 1. Configure location options (callable multiple times; only provided options are changed)
    await RNLocation.configure({
      distanceFilter: 5,                                // meters
      interval: 10000,                                  // milliseconds
      desiredAccuracy: { android: 'highAccuracy' },     // mapped to accuracy-first priority on HarmonyOS
    });

    // 2. Request permission (whenInUse = foreground permission set; always also requests background location)
    const granted = await RNLocation.requestPermission({
      ios: 'whenInUse',
      android: { detail: 'fine' },
    });

    // 3. Subscribe to location updates (payload is a Location[] array; take the latest entry)
    if (granted) {
      unsub = RNLocation.subscribeToLocationUpdates((locations: Location[]) => {
        const latest = locations[0];
        console.log(latest.latitude, latest.longitude, latest.accuracy);
      });
    }
  }

  function stop() {
    unsub?.(); // Unsubscribe and release native location resources
  }

  return (
    <View>
      <Button title="start location" onPress={start} />
      <Button title="stop location" onPress={stop} />
    </View>
  );
}
```

#### Get the latest location once

```js
import RNLocation from 'react-native-location';

// Resolves to null if no location is obtained within the timeout (default 10s)
const location = await RNLocation.getLatestLocation({ timeout: 15000 });
if (location) {
  console.log(location.timestamp, location.latitude, location.longitude);
}
```

#### Permission status query and subscription

```js
import RNLocation from 'react-native-location';

const status = await RNLocation.getCurrentPermission();          // e.g. 'authorizedFine'
const ok = await RNLocation.checkPermission({ ios: 'always' }); // Check permission tier

const unsubscribe = RNLocation.subscribeToPermissionUpdates((status) => {
  console.log('permission changed:', status); // authorizationStatusDidChange event
});
// unsubscribe() to cancel
```

#### Heading and significant location changes

```js
import RNLocation from 'react-native-location';

// Heading: orientation sensor alpha angle (0-360, around the Z axis); headingFilter is the angle threshold
await RNLocation.configure({ headingFilter: 10 });
const unsubHeading = RNLocation.subscribeToHeadingUpdates((h) => {
  console.log('heading:', h.heading);
});

// Significant location changes: approximated on HarmonyOS with a low-power network-positioning
// request using a 1000m distance interval
const unsubSig = RNLocation.subscribeToSignificantLocationUpdates((locations) => {
  console.log('significant:', locations[0]);
});
```

## Available APIs

> [!TIP] The "Platform" column indicates the platforms supported by the original third-party library.

> [!TIP] In the "HarmonyOS Support" column, "Yes" means the property is supported on HarmonyOS; "No" means unsupported (silently ignored or not emitted); "Partially" means partially supported. The usage is consistent across platforms, with behavior benchmarked against iOS or Android.

### API
| Name | Type | Parameter Type | Return Value | Required | Platform | HarmonyOS Support | Description |
|--------|---------|-----|-------|-------|--------|-----|-----------------|
| configure | function | options: ConfigureOptions | Promise\<void\> | Yes | iOS/Android | Yes | Configures location options; callable multiple times and only provided options are changed. Running subscriptions restart with the new options. iOS-specific options and androidProvider are silently ignored on HarmonyOS; the Promise always resolves |
| requestPermission | function | options: RequestPermissionOptions | Promise\<boolean\> | Yes | iOS/Android | Partially | Requests location permission. HarmonyOS mapping (two sequential steps): the first step requests LOCATION + APPROXIMATELY_LOCATION; for the `always` tier, LOCATION_IN_BACKGROUND is requested separately after the foreground grant succeeds (HarmonyOS restriction: the background location permission cannot be combined with foreground permissions in one request). **Note**: the runtime dialog only offers "Allow this time / Allow while in use / Don't allow" — "Always allow" can only be enabled manually by the user in system Settings (consistent with iOS semantics where an always request may degrade to whenInUse); returning `false` for the `always` tier when it is not enabled is expected |
| checkPermission | function | options: RequestPermissionOptions | Promise\<boolean\> | No | iOS/Android | Yes | Checks whether the current permission satisfies the given tier (fine/coarse/whenInUse/always) |
| getCurrentPermission | function | / | Promise\<LocationPermissionStatus\> | No | iOS/Android | Partially | Returns the current permission status. On HarmonyOS the token layer cannot distinguish "never requested" from "denied by user"; unauthorized always returns `denied` |
| subscribeToPermissionUpdates | function | listener: (status: LocationPermissionStatus) => void | Subscription | No | iOS/Android | Partially | Subscribes to permission status changes. HarmonyOS has no system-level permission change push; the event is emitted (deduplicated) after each permission query/request |
| subscribeToLocationUpdates | function | listener: (locations: Location[]) => void | Subscription | Yes | iOS/Android | Yes | Subscribes to continuous location updates. The last known location from `getLastLocation()` is emitted immediately upon subscribing (aligned with Android behavior) |
| getLatestLocation | function | options?: GetLatestLocationOptions | Promise\<Location \| null\> | No | iOS/Android | Yes | Gets the latest location once; resolves to `null` on timeout (default 10s; `timeout: null` means no timeout) |
| subscribeToHeadingUpdates | function | listener: (heading: Heading) => void | Subscription | No | iOS | Partially | Subscribes to heading updates. HarmonyOS approximates CLHeading with the orientation sensor alpha angle (0-360, around the Z axis); no trueHeading/magneticHeading variants |
| subscribeToSignificantLocationUpdates | function | listener: (locations: Location[]) => void | Subscription | No | iOS | Partially | Subscribes to significant location changes. HarmonyOS has no equivalent native API; approximated with an independent low-power (LOW_POWER) request using a 1000m distance interval, unaffected by the configured distanceFilter |

> The return value `Subscription` is an unsubscribe function `() => void`; calling it removes the subscription and releases native resources.

### Events
| Name | Payload | Platform | HarmonyOS Support | Description |
|---|---|---|---|---|
| locationUpdated | Location[] | iOS, Android | Yes | Location update event; the payload is an array (JS side sorts by timestamp and takes the latest) |
| headingUpdated | { heading: number } | iOS | Yes | Heading update event |
| authorizationStatusDidChange | LocationPermissionStatus | iOS | Yes | Permission status change event |
| onWarning | { message: string, type: string } | iOS, Android | Yes | Native warning event. The type follows the Android error code semantics: 401 invalid argument / 403 no permission (mapped from HarmonyOS 201) / 500 location service error (including master switch off 3301100) / 502 heading sensor unavailable |

---

### ConfigureOptions
| Name | Type | Default | Required | Platform | HarmonyOS Support | Description |
|---|---|---|---|---|---|---|
| distanceFilter | number \| void | 100 | No | iOS, Android | Yes | Minimum distance change (meters) before a location callback fires. Mapped to HarmonyOS `distanceInterval` |
| interval | number \| void | / | No | Android | Yes | Desired active update interval (ms). Mapped to HarmonyOS `timeInterval` (seconds); the smallest positive value among interval/fastestInterval/maxWaitTime wins |
| fastestInterval | number \| void | / | No | Android | Yes | Fastest update interval (ms). Merged with interval on HarmonyOS; no dedicated equivalent |
| maxWaitTime | number \| void | / | No | Android | Yes | Maximum wait time for updates (ms). Merged with interval on HarmonyOS; no dedicated equivalent |
| desiredAccuracy.ios | LocationAccuracyIOS \| void | / | No | iOS | No | iOS accuracy tier; no HarmonyOS equivalent, silently ignored |
| desiredAccuracy.android | LocationPriorityAndroid \| void | / | No | Android | Yes | Android power priority. HarmonyOS mapping: `highAccuracy` → ACCURACY (accuracy-first); `balancedPowerAccuracy`/`lowPower`/`noPower` → LOW_POWER (low-power network positioning); defaults to FIRST_FIX when not provided |
| activityType | LocationActivityType \| void | 'other' | No | iOS | No | User activity type; no HarmonyOS equivalent, silently ignored |
| androidProvider | AndroidProvider \| void | 'auto' | No | Android | No | Android provider selection (auto/playServices/standard); HarmonyOS has a single system location service, silently ignored |
| allowsBackgroundLocationUpdates | boolean \| void | false | No | iOS | No | iOS background location toggle. On HarmonyOS, background location is controlled by the LOCATION_IN_BACKGROUND permission; this option is silently ignored |
| pausesLocationUpdatesAutomatically | boolean \| void | true | No | iOS | No | iOS automatic pause; no HarmonyOS equivalent, silently ignored |
| showsBackgroundLocationIndicator | boolean \| void | false | No | iOS | No | iOS background location indicator; no HarmonyOS equivalent, silently ignored |
| headingFilter | number \| void | 0 | No | iOS | Yes | Heading change threshold (degrees) below which callbacks are suppressed; 0 means no filtering. Implemented on HarmonyOS (including 0/360 wrap-around handling) |
| headingOrientation | HeadingOrientation \| void | 'portrait' | No | iOS | No | Reference device orientation for heading; no HarmonyOS equivalent, silently ignored |

---

### RequestPermissionOptions
| Name | Type | Default | Required | Platform | HarmonyOS Support | Description |
|---|---|---|---|---|---|---|
| ios | `'whenInUse' \| 'always' \| 'ignore' \| void` | / | No | iOS | Yes | iOS permission tier. On HarmonyOS: whenInUse → foreground permission set; always → foreground set + background location; ignore skips |
| android | `{ detail: 'fine' \| 'coarse', rationale?: {...} } \| 'ignore' \| void` | / | No | Android | Yes | Android permission tier and rationale dialog text. On HarmonyOS, detail participates in tier checking (fine requires authorizedFine; coarse accepts authorizedFine/authorizedCoarse); rationale is passed through and ignored on HarmonyOS |

---

### GetLatestLocationOptions
| Name | Type | Default | Required | Platform | HarmonyOS Support | Description |
|---|---|---|---|---|---|---|
| timeout | number \| null \| void | 10000 | No | iOS, Android | Yes | Timeout in ms; resolves to `null` on timeout; `null` means no timeout and waits until the first location arrives |

---

### Location
| Name | Type | Platform | HarmonyOS Support | Description |
|---|---|---|---|---|
| timestamp | number | iOS, Android | Yes | Location timestamp (UTC milliseconds) |
| latitude | number | iOS, Android | Yes | Latitude |
| longitude | number | iOS, Android | Yes | Longitude |
| accuracy | number | iOS, Android | Yes | Horizontal accuracy radius (meters), mapped from HarmonyOS `accuracy` |
| altitude | number | iOS, Android | Yes | Altitude (meters), mapped from HarmonyOS `altitude` |
| altitudeAccuracy | number | iOS, Android | Yes | Vertical accuracy (meters), mapped from HarmonyOS `altitudeAccuracy` (optional since API12+, defaults to 0) |
| course | number | iOS, Android | Yes | Direction of travel (degrees, 0-360, true north baseline), mapped from HarmonyOS `direction` |
| courseAccuracy | number | iOS, Android | Yes | Course accuracy, mapped from HarmonyOS `directionAccuracy` (optional, defaults to 0) |
| speed | number | iOS, Android | Yes | Instantaneous speed (m/s), mapped from HarmonyOS `speed` |
| speedAccuracy | number | iOS, Android | Yes | Speed accuracy (m/s), mapped from HarmonyOS `speedAccuracy` (optional, defaults to 0) |
| floor | number | iOS | No | Indoor floor level; no HarmonyOS equivalent, not emitted in the payload |
| fromMockProvider | boolean | Android | No | Whether from a mock provider; no HarmonyOS equivalent, not emitted in the payload |

---

### Heading
| Name | Type | Platform | HarmonyOS Support | Description |
|---|---|---|---|---|
| heading | number | iOS | Yes | Heading angle (degrees, 0-360, around the Z axis). Approximated on HarmonyOS with the orientation sensor `OrientationResponse.alpha`, consistent with compass direction (north 0 / east 90) |

---

### LocationPermissionStatus
| Value | Platform | HarmonyOS Support | Description |
|---|---|---|---|
| authorizedAlways | iOS, Android | Yes | Fine + coarse + background location all granted (LOCATION + APPROXIMATELY_LOCATION + LOCATION_IN_BACKGROUND) |
| authorizedWhenInUse | iOS | No | No equivalent intermediate state on HarmonyOS: foreground fine permission returns `authorizedFine` |
| authorizedFine | Android | Yes | Foreground fine permission (both LOCATION and APPROXIMATELY_LOCATION granted) |
| authorizedCoarse | Android | Yes | Coarse permission only (only APPROXIMATELY_LOCATION granted) |
| denied | iOS, Android | Partially | Not granted. On HarmonyOS the token layer cannot distinguish "never requested" from "denied by user"; always returns this value |
| restricted | iOS, Android | Yes | Returned when the permission status query fails |
| notDetermined | iOS | No | Cannot be distinguished on HarmonyOS (merged with denied); never returned |

## Known Issues
1. The `AndroidProvider` type values differ from the official npm 2.5.0 package (`"auto" | "fused" | "builtin"`); this package uses `"auto" | "playServices" | "standard"` (naming taken from the upstream GitHub master branch). This option is Android-only and ignored at runtime on HarmonyOS, so functionality is unaffected. If business code follows the official npm 2.5.0 types and passes `fused`/`builtin`, a TS compile error occurs — this is a known type-level difference.

## Others
1. Emulators without an orientation sensor/GNSS: subscribing to heading triggers a graceful `onWarning` (502) degradation instead of a crash; when no location can be obtained, `getLatestLocation` returns `null` on timeout. Location-related cases should be verified on real devices first.
2. The first callback after starting location updates may be a historical location from `getLastLocation()` (aligned with the Android `getLastKnownLocation` immediate-report behavior) — this is not a defect.

## Directory Structure
```
/ohos-location              # Project root directory
├── src/                    # RN JS code
│    └─ index.ts            # Entry file (9 public APIs)
│    └─ types.ts            # Type definitions (ConfigureOptions/Location, etc.)
│    └─ utils.ts            # Utility functions
│    └─ lib/                # nativeInterface / permissions / subscriptions
│    └─ specs/v1/           # TurboModule codegen spec (NativeRNLocation.ts)
├── harmony/                # HarmonyOS adaptation code
│    └─ location.har        # HAR package
│    └─ location/           # HarmonyOS adaptation core code
│         └─ index.ets      # HarmonyOS adaptation entry
│         └─ src/main/ets/  # ArkTS implementation
│              └─ RNLocationTurboModule.ets        # Location/heading/permission TurboModule implementation
│              └─ LocationTurboModulesFactory.ets  # Package registration
│              └─ generated/                       # codegen generated code
│         └─ src/main/cpp/  # C++ side registration
│              └─ LocationPackage.h
│              └─ generated/
├── dist/                   # JS build output (commonjs/module/typescript)
├── example/                # Example project
│    └─ App.tsx             # Demo (covers all APIs and options)
│    └─ TESTING.md          # Real-device test document (28 cases)
│    └─ harmony/            # HarmonyOS example project
├── package.json
├── README.md               # Chinese installation and usage guide
└── README_en.md            # English installation and usage guide
```

## How to Contribute

If you find any issues during use, feel free to submit an [Issue](https://github.com/cbd1020819393/react-native-location/issues); PRs are of course also welcome ([Pull Requests](https://github.com/cbd1020819393/react-native-location/pulls)).

## License

This project is licensed under the [MIT License (MIT)](https://github.com/cbd1020819393/react-native-location/blob/master/LICENSE). Enjoy and participate in open source freely.
