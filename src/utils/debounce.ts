/**
 * 防抖函数：用于限制高频点击新增对话按钮，避免重复触发。
 * @param fn 需要被防抖的函数
 * @param wait 间隔时间（毫秒）
 */
export const debounce = <F extends (...args: any[]) => void>(
  fn: F,
  wait = 500,
) => {
  let timer: number | undefined;
  return (...args: Parameters<F>) => {
    if (timer) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = undefined;
      fn(...args);
    }, wait);
  };
};
