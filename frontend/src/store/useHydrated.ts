import { useSyncExternalStore } from 'react';
import { useStore } from './index';

/**
 * 等待 Zustand persist 从 localStorage 恢复数据完成。
 * 返回 true 表示持久化状态已经就绪，可以安全地读取 user/token 了。
 * hydration 完成前不应做任何登录状态判断，否则会因为 user 为 null 而误踢用户去登录页。
 */
const subscribeHydration = (onChange: () => void) => {
  const unsubscribeStart = useStore.persist.onHydrate(onChange);
  const unsubscribeFinish = useStore.persist.onFinishHydration(onChange);
  return () => {
    unsubscribeStart();
    unsubscribeFinish();
  };
};

export function useHydrated() {
  return useSyncExternalStore(
    subscribeHydration,
    () => useStore.persist.hasHydrated(),
    () => false,
  );
}
