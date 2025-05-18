/**
 * 性能监控工具
 */
import * as React from 'react';

// 性能标记类型
type PerformanceMark = {
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
};

// 存储性能标记
const performanceMarks: Record<string, PerformanceMark[]> = {};

/**
 * 开始性能标记
 * @param name 标记名称
 * @returns 标记ID
 */
export function startMark(name: string): string {
  const id = `${name}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // 如果支持Performance API，使用它
  if (typeof performance !== 'undefined' && performance.mark) {
    performance.mark(`${id}_start`);
  }

  return id;
}

/**
 * 结束性能标记
 * @param id 标记ID
 * @param name 标记名称
 */
export function endMark(id: string, name: string): void {
  // 如果支持Performance API，使用它
  if (typeof performance !== 'undefined' && performance.mark && performance.measure) {
    performance.mark(`${id}_end`);
    try {
      performance.measure(name, `${id}_start`, `${id}_end`);
    } catch (e) {
      console.error('性能测量失败:', e);
    }
  }

  // 计算持续时间
  const startTime = performance.getEntriesByName(`${id}_start`)[0]?.startTime || Date.now();
  const endTime = Date.now();
  const duration = endTime - startTime;

  // 存储标记
  if (!performanceMarks[name]) {
    performanceMarks[name] = [];
  }

  performanceMarks[name].push({
    name,
    startTime,
    endTime,
    duration,
  });

  // 如果持续时间超过阈值，记录警告
  if (duration > 100) {
    console.warn(`性能警告: ${name} 操作耗时 ${duration}ms`);
  }
}

/**
 * 获取性能标记
 * @param name 标记名称
 * @returns 性能标记数组
 */
export function getMarks(name?: string): Record<string, PerformanceMark[]> | PerformanceMark[] {
  if (name) {
    return performanceMarks[name] || [];
  }

  return performanceMarks;
}

/**
 * 清除性能标记
 * @param name 标记名称（可选，不提供则清除所有）
 */
export function clearMarks(name?: string): void {
  if (name) {
    delete performanceMarks[name];
  } else {
    Object.keys(performanceMarks).forEach(key => {
      delete performanceMarks[key];
    });
  }
}

/**
 * 性能监控高阶组件
 * @param Component 要监控的组件
 * @param name 组件名称
 * @returns 包装后的组件
 */
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  name: string
): React.FC<P> {
  return function PerformanceMonitoredComponent(props: P) {
    const id = startMark(`render_${name}`);

    React.useEffect(() => {
      endMark(id, `render_${name}`);

      return () => {
        const unmountId = startMark(`unmount_${name}`);
        endMark(unmountId, `unmount_${name}`);
      };
    }, []);

    // 修复JSX语法错误
    return React.createElement(Component, props);
  };
}

/**
 * 性能监控钩子
 * @param name 操作名称
 * @returns 开始和结束函数
 */
export function usePerformanceMonitoring(name: string): {
  start: () => string;
  end: (id: string) => void;
} {
  return {
    start: () => startMark(name),
    end: (id: string) => endMark(id, name),
  };
}

/**
 * 打印性能报告
 */
export function printPerformanceReport(): void {
  console.group('性能报告');

  Object.entries(performanceMarks).forEach(([name, marks]) => {
    if (marks.length === 0) return;

    const totalDuration = marks.reduce((sum, mark) => sum + mark.duration, 0);
    const avgDuration = totalDuration / marks.length;
    const maxDuration = Math.max(...marks.map(mark => mark.duration));

    console.log(`${name}:`);
    console.log(`  调用次数: ${marks.length}`);
    console.log(`  平均耗时: ${avgDuration.toFixed(2)}ms`);
    console.log(`  最大耗时: ${maxDuration}ms`);
  });

  console.groupEnd();
}
