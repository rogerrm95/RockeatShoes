import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {

    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return []
  });

  const addProduct = async (productId: number) => {
    try {

      const updatedCart = [...cart]
      const existsProduct = updatedCart.find(product => product.id === productId)

      const stock = await api.get<Stock>(`stock/${productId}`)
      const stockAmount = stock.data.amount
      const currentStock = existsProduct ? existsProduct.amount : 0;
      const amount = currentStock + 1


      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      if (existsProduct) {
        existsProduct.amount = amount
      } else {
        const product = await api.get(`products/${productId}`)

        const newProduct = {
          ...product.data,
          amount: 1
        }

        updatedCart.push(newProduct)
      }

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))

    } catch {
      toast.error("Erro na adição do produto")
    }
  };

  const removeProduct = (productId: number) => {
    try {

      const updatedCart = [...cart]
      const existsProduct = updatedCart.find(product => productId === product.id)

      if (!existsProduct) {
        toast.error("Erro na remoção do produto")
      } else {

        const newCart = updatedCart.filter(product => product.id !== productId)

        setCart(newCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
      }

    } catch {
      toast.error("Erro na remoção do produto")
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {

      const updatedCart = [...cart]
      const currentStock = await api.get<Stock>(`stock/${productId}`).then(res => res.data.amount)
      const product = updatedCart.filter(item => item.id === productId)

      if (product.length > 0) {
        if (amount > currentStock) {
          toast.error('Quantidade solicitada fora de estoque')
          return

        }
        else if (amount <= 0) {
          return
        }
        else {
          const newCart = updatedCart.map(item => {
            if (item.id === productId) {
              return { ...item, amount: amount }
            }
            return { ...item }
          })

          setCart(newCart)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart))
        }

      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto")
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
