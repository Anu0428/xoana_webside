import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: number;
  name: string;
  nameEn?: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  nickname?: string;
  role: 'USER' | 'ADMIN';
  avatar?: string;
  phone?: string;
  address?: string;
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;

  // Cart
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  cartTotal: () => number;
  cartCount: () => number;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      token: null,
      setAuth: (user, token) => {
        set({ user, token });
      },
      clearAuth: () => {
        set({ user: null, token: null });
      },

      // Cart
      cart: [],
      addToCart: (item) => {
        const cart = get().cart;
        const existing = cart.find((i) => i.id === item.id);
        if (existing) {
          set({
            cart: cart.map((i) =>
              i.id === item.id ? { ...i, ...item, quantity: i.quantity + item.quantity } : i
            ),
          });
        } else {
          set({ cart: [...cart, item] });
        }
      },
      removeFromCart: (id) => set({ cart: get().cart.filter((i) => i.id !== id) }),
      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeFromCart(id);
          return;
        }
        set({ cart: get().cart.map((i) => (i.id === id ? { ...i, quantity } : i)) });
      },
      clearCart: () => set({ cart: [] }),
      cartTotal: () => get().cart.reduce((sum, i) => sum + i.price * i.quantity, 0),
      cartCount: () => get().cart.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: 'xoana-store',
      partialize: (state) => ({ cart: state.cart, user: state.user, token: state.token }),
    }
  )
);
