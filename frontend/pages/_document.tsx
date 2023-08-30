import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
	render() {
		return (
			<Html lang='en'>
				<Head>
					<link
						rel='stylesheet'
						href='https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap'
					/>
					<link
						rel='stylesheet'
						href='https://fonts.googleapis.com/icon?family=Material+Icons'
					/>
					
				</Head>
				<body>
					<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDhsdF_6d5cWmjGlvW0VjnnzumqnJuCXno&libraries=places"async />
					<Main />
					<NextScript />
				</body>
			</Html>
		)
	}
}
export default MyDocument
