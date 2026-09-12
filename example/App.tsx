/**
 * react-native-location 鸿蒙 Example
 *
 * 覆盖库的全部核心 API（对照 react-native-location 2.5.0 接口面）：
 *  - configure（鸿蒙端消费项：distanceFilter / interval / fastestInterval / maxWaitTime /
 *    desiredAccuracy.android 四档 / headingFilter。iOS 专属 6 项与 androidProvider 在鸿蒙
 *    静默忽略、无效果，demo 不设按钮，支持矩阵见 README）
 *  - requestPermission（whenInUse / always / android fine / android coarse）
 *  - getCurrentPermission / checkPermission
 *  - subscribeToPermissionUpdates
 *  - subscribeToLocationUpdates（持续定位）
 *  - getLatestLocation（15s / timeout:null / 缺省 10s 三种超时形态）
 *  - subscribeToHeadingUpdates（航向）
 *  - subscribeToSignificantLocationUpdates（显著位置变化，鸿蒙为低功耗近似实现）
 *  - onWarning 事件（错误码 401/403/500 等，原生侧透出）
 *  - 使用说明卡片（后台长时任务边界 / 默认 distanceFilter / GNSS / timeout:null 语义）
 *
 * 运行前提（真机）：系统「位置信息」开关开启；首次订阅前先点「申请权限」并允许。
 * 后台持续定位需 app 侧另接长时任务（本 demo 未接，退后台回调停止属系统行为）。
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import RNLocation, {
  Location,
  LocationPermissionStatus,
  Heading,
} from 'react-native-location';
import { DeviceEventEmitter } from 'react-native';

function formatTimestamp(ts: number): string {
  // Hermes/ArkJS 无 Intl，用 Date getter 手拼（lessons: intl-own-code）
  const d = new Date(ts);
  const pad = (n: number): string => (n < 10 ? '0' + n : '' + n);
  return (
    d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
  );
}

function locationText(loc: Location | null): string {
  if (!loc) {
    return 'null（超时未获取到位置）';
  }
  return [
    'timestamp : ' + formatTimestamp(loc.timestamp),
    'latitude  : ' + loc.latitude,
    'longitude : ' + loc.longitude,
    'accuracy  : ' + loc.accuracy + ' m',
    'altitude  : ' + loc.altitude + ' m (±' + loc.altitudeAccuracy + ')',
    'course    : ' + loc.course + '° (±' + (loc.courseAccuracy ?? 0) + ')',
    'speed     : ' + loc.speed + ' m/s (±' + (loc.speedAccuracy ?? 0) + ')',
  ].join('\n');
}

function App(): JSX.Element {
  const [permissionStatus, setPermissionStatus] = useState<string>('未查询');
  const [checkWhenInUse, setCheckWhenInUse] = useState<string>('-');
  const [checkAlways, setCheckAlways] = useState<string>('-');
  const [permissionEvents, setPermissionEvents] = useState<string[]>([]);
  const [location, setLocation] = useState<Location | null>(null);
  const [locationCount, setLocationCount] = useState(0);
  const [locIntervals, setLocIntervals] = useState('-');
  const [latestResult, setLatestResult] = useState<string>('-');
  const [latestBusy, setLatestBusy] = useState(false);
  // onWarning effect 依赖为空数组读不到最新 state，用 ref 镜像 busy 供其判定
  const latestBusyRef = useRef(false);

  // busy 双写（state 驱动渲染 + ref 供 onWarning 自动终止判定）
  const setLatestBusyTracked = (busy: boolean): void => {
    latestBusyRef.current = busy;
    setLatestBusy(busy);
  };
  const [heading, setHeading] = useState<Heading | null>(null);
  const [headingCount, setHeadingCount] = useState(0);
  const [significant, setSignificant] = useState<Location | null>(null);
  const [significantCount, setSignificantCount] = useState(0);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [configSummary, setConfigSummary] = useState<string>('默认配置');
  // 订阅开关镜像到 state（ref 变化不触发渲染，按钮文案/强调态读这里）
  const [locRunning, setLocRunning] = useState(false);
  const [headingRunning, setHeadingRunning] = useState(false);
  const [sigRunning, setSigRunning] = useState(false);

  const unsubLocation = useRef<(() => void) | null>(null);
  const unsubHeading = useRef<(() => void) | null>(null);
  const unsubSignificant = useRef<(() => void) | null>(null);
  const unsubPermission = useRef<(() => void) | null>(null);

  // onWarning 监听（库内部也监听并 console.warn；这里在 UI 上展示原生告警）
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      'onWarning',
      (opts: { message?: string; type?: string }) => {
        setWarnings(prev =>
          ['[' + (opts?.type ?? '?') + '] ' + (opts?.message ?? '')].concat(prev).slice(0, 8),
        );
        // getLatestLocation 等待期间收到原生告警（如定位开关关闭 3301100）：
        // 自动终止等待并复位按钮，避免 timeout:null 永久 pending 锁死操作。
        // 注意：库语义不变（promise 仍挂在 pending），这里只是放开 example 的 UI。
        if (latestBusyRef.current) {
          setLatestBusyTracked(false);
          setLatestResult('等待已终止（原生告警）：' + (opts?.message ?? ''));
        }
      },
    );
    return () => {
      sub.remove();
    };
  }, []);

  // 权限状态订阅（authorizationStatusDidChange）
  useEffect(() => {
    const unsub = RNLocation.subscribeToPermissionUpdates((status: LocationPermissionStatus) => {
      setPermissionStatus(status + '（事件）');
      setPermissionEvents(prev => [status + ' @ ' + formatTimestamp(Date.now())].concat(prev).slice(0, 6));
    });
    unsubPermission.current = unsub;
    return () => {
      unsub();
      unsubPermission.current = null;
    };
  }, []);

  // 组件卸载：解除所有订阅（触发原生 stop*，释放定位/传感器资源）
  useEffect(() => {
    return () => {
      unsubLocation.current?.();
      unsubHeading.current?.();
      unsubSignificant.current?.();
      unsubPermission.current?.();
    };
  }, []);

  const refreshPermission = useCallback(async () => {
    const status = await RNLocation.getCurrentPermission();
    setPermissionStatus(status);
    const whenInUse = await RNLocation.checkPermission({ ios: 'whenInUse' });
    setCheckWhenInUse(whenInUse ? 'true' : 'false');
    const always = await RNLocation.checkPermission({ ios: 'always' });
    setCheckAlways(always ? 'true' : 'false');
  }, []);

  const doConfigure = useCallback(async (label: string, options: object) => {
    await RNLocation.configure(options);
    setConfigSummary(label + ' ✓');
  }, []);

  const doRequestWhenInUse = useCallback(async () => {
    const granted = await RNLocation.requestPermission({ ios: 'whenInUse' });
    setPermissionStatus('request whenInUse → ' + granted);
    await refreshPermission();
  }, [refreshPermission]);

  const doRequestAlways = useCallback(async () => {
    const granted = await RNLocation.requestPermission({ ios: 'always' });
    setPermissionStatus(
      granted
        ? 'request always → true(后台已开启)'
        : 'request always → false(后台未开:请到 设置→应用→权限→位置信息 选「始终允许」后重试)',
    );
    await refreshPermission();
  }, [refreshPermission]);

  const doRequestAndroidStyle = useCallback(async () => {
    // harmony 分支：options.android 亦映射到前台组合权限申请
    const granted = await RNLocation.requestPermission({
      android: { detail: 'fine' },
    });
    setPermissionStatus('request android.fine → ' + granted);
    await refreshPermission();
  }, [refreshPermission]);

  // android coarse 档（鸿蒙端接受 authorizedFine 或 authorizedCoarse；
  // Android 端的 rationale 字段鸿蒙无对应机制、无效果，不传入）
  const doRequestAndroidCoarse = useCallback(async () => {
    const granted = await RNLocation.requestPermission({
      android: { detail: 'coarse' },
    });
    setPermissionStatus('request android.coarse → ' + granted);
    await refreshPermission();
  }, [refreshPermission]);

  const doGetLatestLocation = useCallback(async () => {
    setLatestBusyTracked(true);
    setLatestResult('获取中…');
    const loc = await RNLocation.getLatestLocation({ timeout: 15000 });
    setLatestResult(locationText(loc));
    setLatestBusyTracked(false);
  }, []);

  // timeout: null = 不设超时，一直等到首个位置（由订阅退订结束）
  const doGetLatestLocationNoTimeout = useCallback(async () => {
    setLatestBusyTracked(true);
    setLatestResult('获取中…（timeout:null，取到首个位置即返回）');
    const loc = await RNLocation.getLatestLocation({ timeout: null });
    setLatestResult(locationText(loc));
    setLatestBusyTracked(false);
  }, []);

  // 缺省 timeout = 库默认 10s
  const doGetLatestLocationDefaultTimeout = useCallback(async () => {
    setLatestBusyTracked(true);
    setLatestResult('获取中…（缺省 timeout，库默认 10s）');
    const loc = await RNLocation.getLatestLocation();
    setLatestResult(locationText(loc));
    setLatestBusyTracked(false);
  }, []);

  const toggleLocationUpdates = useCallback(() => {
    if (unsubLocation.current) {
      unsubLocation.current();
      unsubLocation.current = null;
      setLocRunning(false);
    } else {
      let lastCbAt = 0;
      let intervals: string[] = [];
      const unsub = RNLocation.subscribeToLocationUpdates((locations: Location[]) => {
        if (locations.length === 0) {
          return;
        }
        // 记录最近 5 次回调间隔,用于验证 configure 的 interval/distanceFilter 实际生效
        const now = Date.now();
        if (lastCbAt > 0) {
          intervals = [String(now - lastCbAt) + 'ms'].concat(intervals).slice(0, 5);
          setLocIntervals(intervals.join(' / '));
        }
        lastCbAt = now;
        const sorted = locations.slice().sort((a, b) => b.timestamp - a.timestamp);
        setLocation(sorted[0]);
        setLocationCount(c => c + 1);
      });
      unsubLocation.current = unsub;
      setLocRunning(true);
    }
  }, []);

  const toggleHeadingUpdates = useCallback(() => {
    if (unsubHeading.current) {
      unsubHeading.current();
      unsubHeading.current = null;
      setHeadingRunning(false);
    } else {
      const unsub = RNLocation.subscribeToHeadingUpdates((h: Heading) => {
        setHeading(h);
        setHeadingCount(c => c + 1);
      });
      unsubHeading.current = unsub;
      setHeadingRunning(true);
    }
  }, []);

  const toggleSignificantUpdates = useCallback(() => {
    if (unsubSignificant.current) {
      unsubSignificant.current();
      unsubSignificant.current = null;
      setSigRunning(false);
    } else {
      const unsub = RNLocation.subscribeToSignificantLocationUpdates((locations: Location[]) => {
        if (locations.length === 0) {
          return;
        }
        const sorted = locations.slice().sort((a, b) => b.timestamp - a.timestamp);
        setSignificant(sorted[0]);
        setSignificantCount(c => c + 1);
      });
      unsubSignificant.current = unsub;
      setSigRunning(true);
    }
  }, []);

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.h1}>react-native-location（HarmonyOS）</Text>

        {/* 使用说明：鸿蒙端已知边界（后台长时任务 / 默认过滤 / GNSS / timeout:null 语义） */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>使用说明（鸿蒙端已知边界）</Text>
          <Text style={styles.dim}>
            1. 后台持续定位 = 后台定位权限 + 长时任务（backgroundTaskManager，LOCATION
            类型），两者缺一不可。本 demo 未接长时任务：退后台/锁屏后回调会停止，属系统
            行为，非 bug；需后台定位请在 app 侧自行接入长时任务。
          </Text>
          <Text style={styles.dim}>
            2. 原生默认 distanceFilter=100m：不点 configure 直接订阅，走 5m 不回调是预期行为。
          </Text>
          <Text style={styles.dim}>
            3. 定位 fix 来源二选一：GNSS（室外/窗边见天）或 网络定位（WLAN/基站，需联网）。
            室内且断网时两者皆无→注册成功但永不回调、无任何告警（真机实测：联网后恢复）。
            可用「distanceFilter=0(实时)」验证回调链路是否正常。
          </Text>
          <Text style={styles.dim}>
            4. timeout:null 为源库语义（等到首个位置为止）：定位开关关闭时原生立刻告警，
            本 demo 会自动终止等待并复位按钮；但该次调用不会自动恢复，需重新触发订阅。
          </Text>
          <Text style={styles.dim}>
            5. 排查顺序：先看「onWarning 原生告警」卡片，再看持续定位回调计数；真机日志：
            hdc shell hilog | findstr RNLocation。
          </Text>
        </View>

        {/* 权限区 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>权限</Text>
          <Text style={styles.mono}>getCurrentPermission: {permissionStatus}</Text>
          <Text style={styles.mono}>checkPermission whenInUse: {checkWhenInUse} / always: {checkAlways}</Text>
          <View style={styles.row}>
            <Btn title="申请权限(前台)" onPress={doRequestWhenInUse} />
            <Btn title="申请权限(含后台)" onPress={doRequestAlways} />
          </View>
          <View style={styles.row}>
            <Btn title="android.fine 风格" onPress={doRequestAndroidStyle} />
            <Btn title="android.coarse 风格" onPress={doRequestAndroidCoarse} />
            <Btn title="刷新状态" onPress={refreshPermission} />
          </View>
          <Text style={styles.dim}>
            前台档:走系统弹窗「本次使用允许 / 仅使用期间允许 / 不允许」,选「仅使用期间允许」即授予前台。
          </Text>
          <Text style={styles.dim}>
            含后台档:先弹前台弹窗;后台权限系统不弹窗、也不会自动授予——鸿蒙限制,需手动到
            设置→应用→权限→位置信息 选「始终允许」,开启后本按钮才会返回 true(与 iOS 申请 always
            被降级的语义一致)。
          </Text>
          <Text style={styles.dim}>
            状态对照:authorizedFine=仅前台 / authorizedAlways=含后台(始终允许) / denied=未授权。
          </Text>
          <Text style={styles.dim}>
            传参兼容:鸿蒙同时兼容 ios(whenInUse/always)与 android(detail:fine/coarse)两套传参——
            whenInUse 与 android.fine/coarse 均映射为同一前台组合申请(等效);fine/coarse 的差别体现在
            checkPermission 档位判定(fine 要求 authorizedFine,coarse 接受 authorizedFine/Coarse);
            ios.always 额外含后台定位。
          </Text>
          <Text style={styles.label}>权限变化事件（subscribeToPermissionUpdates）：</Text>
          {permissionEvents.length === 0
            ? <Text style={styles.dim}>暂无（授权/在设置中改权限后触发）</Text>
            : permissionEvents.map((e, i) => <Text key={i} style={styles.mono}>{e}</Text>)}
        </View>

        {/* configure 区 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>configure 定位参数</Text>
          <Text style={styles.dim}>当前：{configSummary}（原生默认 distanceFilter=100m）</Text>
          <View style={styles.row}>
            <Btn title="高精度+5m" onPress={() =>
              doConfigure('highAccuracy / 5m / 1s', {
                distanceFilter: 5,
                interval: 1000,
                desiredAccuracy: { android: 'highAccuracy' },
              })} />
            <Btn title="低功耗+100m" onPress={() =>
              doConfigure('lowPower / 100m / 30s', {
                distanceFilter: 100,
                interval: 30000,
                desiredAccuracy: { android: 'lowPower' },
              })} />
          </View>
          <View style={styles.row}>
            <Btn title="headingFilter 10°" onPress={() => doConfigure('headingFilter=10°', { headingFilter: 10 })} />
            <Btn title="恢复默认" onPress={() => doConfigure('默认配置', {})} />
          </View>
          <View style={styles.row}>
            {/* fastestInterval/maxWaitTime：鸿蒙端与 interval 取三者最小正值换算 timeInterval */}
            <Btn title="fastestInterval/maxWaitTime" onPress={() =>
              doConfigure('fastest 5s / maxWait 20s', {
                fastestInterval: 5000,
                maxWaitTime: 20000,
              })} />
            {/* desiredAccuracy.android 剩余两档：均映射 LOW_POWER */}
            <Btn title="balancedPower/noPower" onPress={() =>
              doConfigure('balancedPowerAccuracy', {
                desiredAccuracy: { android: 'balancedPowerAccuracy' },
              })} />
          </View>
          <View style={styles.row}>
            {/* distanceFilter=0：不做距离过滤，每个 timeInterval 周期必回调（验证回调链路） */}
            <Btn title="distanceFilter=0(实时)" onPress={() =>
              doConfigure('实时(0m/1s)', {
                distanceFilter: 0,
                interval: 1000,
                desiredAccuracy: { android: 'highAccuracy' },
              })} />
          </View>
        </View>

        {/* 持续定位 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>subscribeToLocationUpdates 持续定位</Text>
          <View style={styles.row}>
            <Btn
              title={locRunning ? '停止订阅' : '开始订阅'}
              emphasized={!locRunning}
              onPress={toggleLocationUpdates}
            />
            <Text style={styles.counter}>回调 {locationCount} 次</Text>
          </View>
          <Text style={styles.counter}>
            回调间隔(近5次):{locIntervals}
            {locRunning ? '' : '(未订阅)'}
          </Text>
          <Text style={styles.mono}>{locationText(location)}</Text>
        </View>

        {/* 单次定位 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>getLatestLocation 单次最新定位</Text>
          <View style={styles.row}>
            <Btn title={latestBusy ? '获取中…' : '获取（15s 超时）'} onPress={doGetLatestLocation} disabled={latestBusy} />
            <Btn title="timeout:null" onPress={doGetLatestLocationNoTimeout} disabled={latestBusy} />
            <Btn title="缺省超时(10s)" onPress={doGetLatestLocationDefaultTimeout} disabled={latestBusy} />
          </View>
          <Text style={styles.mono}>{latestResult}</Text>
          <Text style={styles.dim}>
            timeout:null 为源库语义：不设超时、一直等到首个位置；定位开关关闭时原生会立刻
            告警并自动终止等待、复位按钮（但需重新触发订阅才能恢复取位）。
          </Text>
        </View>

        {/* 航向 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>subscribeToHeadingUpdates 航向（方向传感器）</Text>
          <View style={styles.row}>
            <Btn
              title={headingRunning ? '停止订阅' : '开始订阅'}
              emphasized={!headingRunning}
              onPress={toggleHeadingUpdates}
            />
            <Text style={styles.counter}>回调 {headingCount} 次</Text>
          </View>
          <Text style={styles.mono}>
            {heading ? 'heading: ' + heading.heading.toFixed(1) + '°（0-360，绕 Z 轴）' : '未订阅'}
          </Text>
          <Text style={styles.dim}>说明：鸿蒙无 CLHeading，以方向传感器 alpha 角近似；模拟器可能无传感器（会收到 onWarning 502）。</Text>
        </View>

        {/* 显著位置变化 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>subscribeToSignificantLocationUpdates 显著位置变化</Text>
          <View style={styles.row}>
            <Btn
              title={sigRunning ? '停止订阅' : '开始订阅'}
              emphasized={!sigRunning}
              onPress={toggleSignificantUpdates}
            />
            <Text style={styles.counter}>回调 {significantCount} 次</Text>
          </View>
          <Text style={styles.mono}>{significant ? locationText(significant) : '未订阅'}</Text>
          <Text style={styles.dim}>说明：鸿蒙无原生显著位置变化 API，以低功耗网络定位（LOW_POWER + 1000m 间隔）近似模拟，粒度与 iOS 不完全等价。</Text>
        </View>

        {/* 告警 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>onWarning 原生告警（最近 8 条）</Text>
          {warnings.length === 0
            ? <Text style={styles.dim}>暂无（位置开关关闭/无权限时会收到 403/3301100 映射告警）</Text>
            : warnings.map((w, i) => (
              <Text key={i} style={styles.warn}>{w}</Text>
            ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface BtnProps {
  title: string;
  onPress: () => void;
  emphasized?: boolean;
  disabled?: boolean;
}

function Btn({ title, onPress, emphasized, disabled }: BtnProps): JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.btn, emphasized && styles.btnEmph, disabled && styles.btnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.6}>
      <Text style={[styles.btnText, emphasized && styles.btnTextEmph]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#f2f3f5',
  },
  scroll: {
    padding: 12,
    paddingBottom: 40,
  },
  h1: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginVertical: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginVertical: 4,
    gap: 8,
  },
  btn: {
    backgroundColor: '#e8eaed',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  btnEmph: {
    backgroundColor: '#2f6fed',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: '#333',
    fontSize: 13,
  },
  btnTextEmph: {
    color: '#ffffff',
  },
  mono: {
    fontFamily: 'Courier New',
    fontSize: 12,
    color: '#222',
    marginTop: 4,
    lineHeight: 18,
  },
  label: {
    fontSize: 12,
    color: '#555',
    marginTop: 8,
  },
  dim: {
    fontSize: 11,
    color: '#888',
    marginTop: 4,
    lineHeight: 16,
  },
  warn: {
    fontSize: 11,
    color: '#b3261e',
    marginTop: 4,
  },
  counter: {
    fontSize: 12,
    color: '#555',
  },
});

export default App;
