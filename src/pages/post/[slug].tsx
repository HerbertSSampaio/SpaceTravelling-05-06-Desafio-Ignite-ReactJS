import { GetStaticPaths, GetStaticProps } from 'next';
import Prismic from '@prismicio/client';
import { FiCalendar, FiUser, FiClock } from 'react-icons/fi';
import { format, formatDistance } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { RichText } from 'prismic-dom';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Header from '../../components/Header';
import { getPrismicClient } from '../../services/prismic';
import { Comments } from '../../components/ReactUtterances';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

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
  preview: boolean;
  nextPost: string | null;
  prevPost: string | null;
}

export default function Post({
  post,
  preview,
  nextPost,
  prevPost,
}: PostProps): JSX.Element {
  const router = useRouter();
  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  return (
    <>
      <Header />
      <img src={post?.data.banner.url} alt="Banner" width="100%" />
      <article className={`${commonStyles.container} ${styles.container}`}>
        <header>
          <h1>{post?.data.title}</h1>
          <div>
            <time>
              <FiCalendar />

              {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                locale: ptBR,
              })}
            </time>
            <span>
              <FiUser />
              {post.data.author}
            </span>
            <time>
              <FiClock />
              <span>há </span>
              {formatDistance(
                new Date(post.first_publication_date),
                new Date(),
                {
                  locale: ptBR,
                }
              )}
            </time>
          </div>
        </header>
        {post.data.content.map(content => {
          return (
            <section className={styles.postContent} key={content.heading}>
              <h2>{content.heading}</h2>
              <div
                dangerouslySetInnerHTML={{
                  __html: RichText.asHtml(content.body),
                }}
              />
            </section>
          );
        })}
        <Comments />
      </article>
      <hr />
      <footer className={styles.othersPosts}>
        {nextPost ? (
          <div>
            <h3>Como Utilizar hooks</h3>
            <Link href={`/post/${nextPost}`}>
              <a>Post Anterior</a>
            </Link>
          </div>
        ) : (
          <div />
        )}
        ;
        {prevPost ? (
          <div>
            <h3>Como Utilizar hooks</h3>
            <Link href={`/post/${prevPost}`}>
              <a>Próximo post</a>
            </Link>
          </div>
        ) : (
          <div />
        )}
      </footer>
      {preview && (
        <aside>
          <Link href="/api/exit-preview">
            <a>Sair do modo Preview</a>
          </Link>
        </aside>
      )}
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();
  const posts = await prismic.query([
    Prismic.Predicates.at('document.type', 'posts'),
  ]);

  return {
    paths: posts.results.map(post => {
      return {
        params: {
          slug: post.uid,
        },
      };
    }),
    fallback: true,
  };
};

export const getStaticProps: GetStaticProps = async ({
  params,
  preview = false,
  previewData,
}) => {
  const { slug } = params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('desafios', String(slug), {
    ref: previewData?.ref ?? null,
  });
  const nextResponse = await prismic.query(
    Prismic.Predicates.at('document.type', 'desafios'),
    {
      pageSize: 1,
      after: response?.id,
      orderings: '[document.first_publication_date desc]',
    }
  );
  const prevResponse = await prismic.query(
    Prismic.Predicates.at('document.type', 'desafios'),
    {
      pageSize: 1,
      after: response?.id,
      orderings: '[document.first_publication_date]',
    }
  );

  const nextPost = nextResponse.results[0]?.uid || null;
  const prevPost = prevResponse.results[0]?.uid || null;

  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      author: response.data.author,
      banner: {
        url: response.data.banner.url,
      },
      content: response.data.content.map(content => {
        return {
          heading: content.heading,
          body: [...content.body],
        };
      }),
    },
  };

  return {
    props: {
      post,
      preview,
      nextPost,
      prevPost,
    },
    revalidate: 60 * 30,
  };
};
