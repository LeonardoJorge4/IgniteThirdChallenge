import { GetStaticPaths, GetStaticProps } from 'next';

import { getPrismicClient } from '../../services/prismic';
import PrismicDOM from 'prismic-dom';
import Prismic from '@prismicio/client';

import styles from './post.module.scss';
import { FiCalendar, FiUser, FiClock } from "react-icons/fi";
import { RichText } from "prismic-dom"
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import Head from 'next/head';
import { useRouter } from 'next/router';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({ post }: PostProps) {
  const router = useRouter();

  const totalContent = post.data.content.reduce((acc, el) => {
    const textBody = PrismicDOM.RichText.asText(el.body);
    const words = textBody.split(' ');
    acc.words += words.length;
    return acc;
  }, {
    words: 0
  })

  const formatedDate = format(
    new Date(post.first_publication_date),
    'dd MMM yyyy',
    {
      locale: ptBR,
    }
  );

  if (router.isFallback) {
    return <div>Carregando...</div>;
  }
  
  return (
    <>
      <Head>
        <title>{`Space Traveling | ${post.data.title}`}</title>
      </Head>
      
      <div className={styles.container}>
        <div className={styles.containerPost}>

          <div className={styles.banner}>
            <img src={post.data.banner.url} alt={post.data.title} />
          </div>

          <div className={styles.contentPost}>
            <div className={styles.containerInfo}>
              <h1>{post.data.title}</h1>
              <div className={styles.informations}>
                <div className={styles.containerDate}>
                  <FiCalendar className={styles.icon} />
                  <span>{formatedDate}</span>
                </div>
                <div className={styles.containerAuthor}>
                  <FiUser className={styles.icon} />
                  <span>{post.data.author}</span>
                </div>
                <div className={styles.containerTimer}>
                  <FiClock className={styles.icon}  />
                  <span>{Math.ceil(totalContent.words/200)} min</span>
                </div>
              </div>
            </div>
            <div className={styles.containerContent}>
            {post.data.content.map(item => {
              return (
                <div key={item.heading}>
                  <h2>{item.heading}</h2>
                  <div 
                    dangerouslySetInnerHTML={
                      { __html: RichText.asHtml(item.body) }
                    }
                  >
                  </div>
                </div> //ser humano le 200 por minuto
              )
            })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts')
  ]);

  let paths = [];

  paths = posts.results.map(post => {
    return {
      params: {
        slug: post.uid
      }
    }
  })

  return { paths, fallback: true }
};


export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { slug } = params

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {});

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
        content: response.data.content.map(content => {
          return {
            heading: content.heading,
            body: [...content.body]
          }
        })
      }
    }

  return {
    props: { 
      post,
    },
    redirect: 60 * 30, //30 minutes
  }
}
