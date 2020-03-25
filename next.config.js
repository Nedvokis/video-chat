// next.config.js
const path = require('path')
const withCSS = require('@zeit/next-css')

module.exports = withCSS({
	webpack: (config, { defaultLoaders }) => {
		config.resolve.alias['~'] = path.join(__dirname)
		config.module.rules.push({
			test: /\.scss$/,
			use: [
				defaultLoaders.babel,
				{
					loader: require('styled-jsx/webpack').loader,
					options: {
					type: 'scoped',
					},
				},
				'sass-loader',
			],
		})
	return config
	},
})