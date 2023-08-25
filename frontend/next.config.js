const withPWA = require('next-pwa')
const withPlugins = require('next-compose-plugins')
const runtimeCaching = require('next-pwa/cache')

const nextConfig = {
	output: 'standalone'
}

module.exports = withPlugins(
	[
		[
			withPWA,
			{
				dest: 'public',
				runtimeCaching,
				disable: process.env.NODE_ENV === 'development'
			}
		]
	],
	nextConfig
)
