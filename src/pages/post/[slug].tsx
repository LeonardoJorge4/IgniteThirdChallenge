import { GetStaticPaths, GetStaticProps } from 'next';

import { getPrismicClient } from '../../services/prismic';
import PrismicDOM from 'prismic-dom';
import Prismic from '@prismicio/client';

import styles from './post.module.scss';
import commonStyles from '../../styles/common.module.scss';
import { FiCalendar, FiUser, FiClock } from "react-icons/fi";
import { RichText } from "prismic-dom"
import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Comments from '../../components/Comments';

interface Post {
  first_publication_date: string | null;
  last_publication_date: string | null;
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
  navigation: {
    prevPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
    nextPost: {
      uid: string;
      data: {
        title: string;
      };
    }[];
  }
  preview: boolean;
}

export default function Post({ post, navigation, preview }: PostProps) {
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

  const isPostEdited = post.first_publication_date !== post.last_publication_date;

  let editionDate;
  if (isPostEdited) {
    editionDate = format(
      new Date(post.last_publication_date),
      "'* editado em' dd MMM yyyy', às' H':'m",
      {
        locale: ptBR,
      }
    )
  }

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
              <div className={styles.containerIsPostEdited}>
                <span>{isPostEdited && editionDate}</span>
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

            <div className={styles.line}></div>

            <section className={`${styles.navigation} ${styles.container}`}>
              {navigation?.prevPost.length > 0 && (
                <div>
                  <h3>{navigation.prevPost[0].data.title}</h3>
                  <Link href={`/post/${navigation.prevPost[0].uid}`}>
                    <a>Post anterior</a>
                  </Link>
                </div>
              )}
              {navigation?.nextPost.length > 0 && (
              <div>
                <h3>{navigation.nextPost[0].data.title}</h3>
                <Link href={`/post/${navigation.nextPost[0].uid}`}>
                  <a>Próximo post</a>
                </Link>
              </div>
              )}
            </section>

            <Comments />

            {preview && (
              <aside>
                <Link href="/api/exit-preview">
                  <a className={commonStyles.preview}>Sair do modo preview</a>
                </Link>
              </aside>
            )}
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

export const getStaticProps: GetStaticProps = async ({ 
  params, 
  preview = false, 
  previewData 
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();
  const response = await prismic.getByUID('posts', String(slug), {
    ref: previewData?.ref || null,
  });

  const prevPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.first_publication_date]'
    }
  )

  const nextPost = await prismic.query(
    [Prismic.Predicates.at('document.type', 'posts')],
    {
      pageSize: 1,
      after: response.id,
      orderings: '[document.last_publication_date desc]'
    }
  )

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    last_publication_date: response.last_publication_date,
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
      navigation: {
        prevPost: prevPost?.results,
        nextPost: nextPost?.results,
      },
      preview,
    },
    redirect: 60 * 30, //30 minutes
  }
}
