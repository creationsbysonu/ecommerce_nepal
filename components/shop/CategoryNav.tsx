import styles from './category-nav.module.css';
import Link from 'next/link';
import { ShoppingBag, Smartphone, Sparkles, Monitor, Home, Utensils, Baby, Car, Bike, Dumbbell, Book, Sofa } from 'lucide-react';

const categories = [
  { name: 'For You', icon: <ShoppingBag size={24} strokeWidth={1.5} />, isActive: true },
  { name: 'Groceries', icon: <ShoppingBag size={24} strokeWidth={1.5} /> },
  { name: 'Mobiles', icon: <Smartphone size={24} strokeWidth={1.5} /> },
  { name: 'Fashion', icon: <Sparkles size={24} strokeWidth={1.5} /> },
  { name: 'Electronics', icon: <Monitor size={24} strokeWidth={1.5} /> },
  { name: 'Home', icon: <Home size={24} strokeWidth={1.5} /> },
  { name: 'Travel', icon: <Car size={24} strokeWidth={1.5} /> },
  { name: 'Appliances', icon: <Utensils size={24} strokeWidth={1.5} /> },
  { name: 'Toys, Baby', icon: <Baby size={24} strokeWidth={1.5} /> },
  { name: '2 Wheelers', icon: <Bike size={24} strokeWidth={1.5} /> },
  { name: 'Sports', icon: <Dumbbell size={24} strokeWidth={1.5} /> },
  { name: 'Books', icon: <Book size={24} strokeWidth={1.5} /> },
  { name: 'Furniture', icon: <Sofa size={24} strokeWidth={1.5} /> },
];

export function CategoryNav() {
  return (
    <div className={styles.categoryNavWrapper}>
      <div className={`container ${styles.categoryNav}`}>
        {categories.map((cat) => (
          <Link href={`/category/${cat.name.toLowerCase()}`} key={cat.name} className={`${styles.categoryItem} ${cat.isActive ? styles.active : ''}`}>
            <div className={styles.iconWrapper}>
              {cat.icon}
            </div>
            <span>{cat.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
