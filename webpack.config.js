const autoprefixer = require('autoprefixer');
const webpack = require('webpack');
const path = require('path');
const precss = require('precss');

// For extending library
const TransferWebpackPlugin = require('transfer-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
	// Set develop tool, including of eval and source-map, etc..
	devtool: 'eval',
	entry: [
		'./index.js'
	],
	output: {
		path: path.resolve(__dirname, "dist"),
		filename: 'lightbox.js',
		publicPath: './'
	},
	module: {
		rules: [			
			/** React node_modules plugins **/
			// {
			// 	test: /\.jsx?$/,
			// 	exclude: /node_modules/,
			// 	loader: 'babel-loader',
			// 	query: {
          	//		cacheDirectory: true,
        	//	},
			// }
			{
				test: /\.js$/,
				exclude: /node_modules/,
				loader: "babel-loader",
				query: {
					presets: ["es2015"]
				}
			},
			{
				test: /\.css$/,
				use: ["style-loader", "css-loader", "postcss-loader"]
			},
			{
				test: /\.scss$/,
				use: ExtractTextPlugin.extract({
					fallback: 'style-loader',
					use: [
						{
							loader: 'css-loader'
						},
						{
							loader: 'postcss-loader',
							options: {
								plugins() {
									/** post css plugins can be exported to postcss.config.js **/
									return [
										precss,
										autoprefixer
									];
								}
							}
						},
						{
							loader: 'sass-loader'
						}
					]
				})
			}
		]
	},
	plugins: [
		/** new webpack HotModuleReplacementPlugin() **/ 		
		new ExtractTextPlugin("lightbox.css"),
	]
};


