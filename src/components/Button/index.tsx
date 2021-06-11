import React from 'react'
import styles from './styles.module.scss';

interface ButtonLoadMorePostsProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  title: string;
}

export function LoadMorePosts({ title, ...props }: ButtonLoadMorePostsProps) {
  return (
    <button 
      className={styles.buttonLoadMorePosts}
    {...props}>
      {title}
    </button>
  )
}