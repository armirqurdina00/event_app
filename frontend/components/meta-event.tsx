import Head from 'next/head';

const MetaEvent = ({ title, description, imageUrl }) => {
  return (
    <Head>
      <title key="title">{title}</title>
      <meta key="description" name="description" content={description} />
      <meta key="og:title" property="og:title" content={title} />
      <meta
        key="og:description"
        property="og:description"
        content={description}
      />
      <meta key="og:image" property="og:image" content={imageUrl} />
    </Head>
  );
};

export default MetaEvent;
