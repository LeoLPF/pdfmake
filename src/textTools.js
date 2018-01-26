/* jslint node: true */
'use strict';


//WORD_RE    reEdit by LPF,增加了中文分词正则，以及对数值及标点符号的处理正则
var WORD_RE = /([`~!@#$%\^&\*()_　\-\+=\{\}\[\]\|:\";\'<>?,\.\/\\～·！@#￥%……&×（）——=『』【】、：“；”‘’《》〈〉？，。\uFB00-\uFFFD]*[-|+|]*\d+((\.\d+)|(\.[A-Za-z]+))[ `~!@#$%\^&\*()_　\-\+=\{\}\[\]\|:\";\'<>?,\.\/\\～·！@#￥%……&×（）——=『』【】、：“；”‘’《》〈〉？，。\uFB00-\uFFFD]*)|([`~!@#$%\^&\*()_　\-\+=\{\}\[\]\|:\";\'<>?,\.\/\\～·！@#￥%……&×（）——=『』【】、：“；”‘’《》〈〉？，。\uFB00-\uFFFD]*[-|+|]*\d+[ `~!@#$%\^&\*()_　\-\+=\{\}\[\]\|:\";\'<>?,\.\/\\～·！@#￥%……&×（）——=『』【】、：“；”‘’《》〈〉？，。\uFB00-\uFFFD\n])|([`~!@#$%\^&\*()_　\-\+=\{\}\[\]\|:\";\'<>?,\.\/\\～·！@#￥%……&×（）——=『』【】、：“；”‘’《》〈〉？，。\uFB00-\uFFFD]*[-|+|]*\d+((\.\d+)+|(\.[A-Za-z]+)+)[ `~!@#$%\^&\*()_　\-\+=\{\}\[\]\|:\";\'<>?,\.\/\\～·！@#￥%……&×（）——=『』【】、：“；”‘’《》〈〉？，。\uFB00-\uFFFD\n]*)|([-|+|]*\d+)|([\u4E00-\u9FFF][ `~!@#$%\^&\*()_　\-\+=\{\}\[\]\|:\";\'<>?,\.\/\\～·！@#￥%……&×（）——=『』【】、：“；”‘’《》〈〉？，。\uFB00-\uFFFD\n]*)|([\u4E00-\u9FFF])|([^ `~!@#$%\^&\*()_　\-\+=\{\}\[\]\|:\";\'<>?,\.\/\\～·！@#￥%……&×（）——=『』【】、：“；”‘’《》〈〉？，。\uFB00-\uFFFD]*[a-zA-Z]+[ `~!@#$%\^&\*()_\-\+=\{\}\[\]\|:\";\'<>?,\.\/\\～·！@#￥%……&×（）——=『』【】、：“；”‘’《》〈〉？，。\uFB00-\uFFFD\n]*)|([\uFB00-\uFFFD]*[ `~!@#$%\^&\*()_　\-\+=\{\}\[\]\|:\";\'<>?,\.\/\\～·！@#￥%……&×（）——=『』【】、：“；”‘’《》〈〉？，。\uFB00-\uFFFD\n]*)|\n/g;

//var WORD_RE = /([^ ,\/!.?:;\-\n]*[ ,\/!.?:;\-]*)|\n/g;    //原作者的分词正则代码
// /\S*\s*/g to be considered (I'm not sure however - we shouldn't split 'aaa !!!!')

var LEADING = /^(\s)+/g;
var TRAILING = /(\s)+$/g;

/**
* Creates an instance of TextTools - text measurement utility
*
* @constructor
* @param {FontProvider} fontProvider
*/
function TextTools(fontProvider) {
	this.fontProvider = fontProvider;
}

/**
 * Converts an array of strings (or inline-definition-objects) into a collection
 * of inlines and calculated minWidth/maxWidth.
* and their min/max widths
* @param  {Object} textArray - an array of inline-definition-objects (or strings)
* @param  {Object} styleContextStack current style stack
* @return {Object}                   collection of inlines, minWidth, maxWidth
*/
TextTools.prototype.buildInlines = function(textArray, styleContextStack) {
	var measured = measure(this.fontProvider, textArray, styleContextStack);

	var minWidth = 0,
		maxWidth = 0,
		currentLineWidth;

	measured.forEach(function (inline) {
		minWidth = Math.max(minWidth, inline.width - inline.leadingCut - inline.trailingCut);

		if (!currentLineWidth) {
			currentLineWidth = { width: 0, leadingCut: inline.leadingCut, trailingCut: 0 };
		}

		currentLineWidth.width += inline.width;
		currentLineWidth.trailingCut = inline.trailingCut;

		maxWidth = Math.max(maxWidth, getTrimmedWidth(currentLineWidth));

		if (inline.lineEnd) {
			currentLineWidth = null;
		}
	});

	if (getStyleProperty({}, styleContextStack, 'noWrap', false)) {
		minWidth = maxWidth;
	}

	return {
		items: measured,
		minWidth: minWidth,
		maxWidth: maxWidth
	};

	function getTrimmedWidth(item) {
		return Math.max(0, item.width - item.leadingCut - item.trailingCut);
	}
};

/**
* Returns size of the specified string (without breaking it) using the current style
* @param  {String} text              text to be measured
* @param  {Object} styleContextStack current style stack
* @return {Object}                   size of the specified string
*/
TextTools.prototype.sizeOfString = function(text, styleContextStack) {
	text = text.replace('\t', '    ');

	//TODO: refactor - extract from measure
	var fontName = getStyleProperty({}, styleContextStack, 'font', 'Roboto');
	var fontSize = getStyleProperty({}, styleContextStack, 'fontSize', 12);
	var bold = getStyleProperty({}, styleContextStack, 'bold', false);
	var italics = getStyleProperty({}, styleContextStack, 'italics', false);
	var lineHeight = getStyleProperty({}, styleContextStack, 'lineHeight', 1);

	var font = this.fontProvider.provideFont(fontName, bold, italics);

	return {
		width: font.widthOfString(removeDiacritics(text), fontSize),
		height: font.lineHeight(fontSize) * lineHeight,
		fontSize: fontSize,
		lineHeight: lineHeight,
		ascender: font.ascender / 1000 * fontSize,
		decender: font.decender / 1000 * fontSize
	};
};

function splitWords(text, noWrap) {
	var results = [];
	text = text.toString().replace('\t', '    ');

	var array;
	if (noWrap) {
		array = [ text, "" ];
	} else {
		array = text.match(WORD_RE);
		var array2 = [];
		for(var i = 0,l=array.length;i<l;i++){
			while(array[i].length>20){
				array2[array2.length] = array[i].slice(0,2);
				array[i] = array[i].slice(2);
			}
			array2[array2.length] = array[i];
		}
		array = array2;
	}
	// i < l - 1, because the last match is always an empty string
	// other empty strings however are treated as new-lines
	for(var i = 0, l = array.length; i < l - 1; i++) {
		var item = array[i];

		var isNewLine = item.length === 0;

		if (!isNewLine) {
			results.push({text: item});
		}
		else {
			var shouldAddLine = (results.length === 0 || results[results.length - 1].lineEnd);

			if (shouldAddLine) {
				results.push({ text: '', lineEnd: true });
			}
			else {
				results[results.length - 1].lineEnd = true;
			}
		}
	}
	return results;
}

function copyStyle(source, destination) {
	destination = destination || {};
	source = source || {}; //TODO: default style

	for(var key in source) {
		if (key != 'text' && source.hasOwnProperty(key)) {
			destination[key] = source[key];
		}
	}

	return destination;
}

function normalizeTextArray(array) {
	var results = [];

	if (typeof array == 'string' || array instanceof String) {
		array = [ array ];
	}

	for(var i = 0, l = array.length; i < l; i++) {
		var item = array[i];
		var style = null;
		var words;

		if (typeof item == 'string' || item instanceof String) {
			words = splitWords(item);
		} else if(Array.isArray(item.text)){
			//reEdit by LPF 用于支持行内多层次样式变化   start      原作者代码中没有此判断节点
			style = copyStyle(item);
			var subResults = normalizeTextArray(item.text);
			for(var si= 0, sl = subResults.length;si<sl;si++){
				var result = subResults[si];
				var subStyle = copyStyle(result);
				var style2 = copyStyle(style);
				subStyle = copyStyle(subStyle,style2);
				result = copyStyle(subStyle,result);
				results.push(result);
			}
			continue;
			//reEdit by LPF 用于支持行内多层次样式变化   end
		}else{
			words = splitWords(item.text, item.noWrap);
			style = copyStyle(item);
		}

		for(var i2 = 0, l2 = words.length; i2 < l2; i2++) {
			var result = {
				text: words[i2].text
			};

			if (words[i2].lineEnd) {
				result.lineEnd = true;
			}

			copyStyle(style, result);

			results.push(result);
		}
	}

	return results;
}

//TODO: support for other languages (currently only polish is supported)
var diacriticsMap = { 'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z', 'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z' };
// '  << atom.io workaround

function removeDiacritics(text) {
	return text.replace(/[^A-Za-z0-9\[\] ]/g, function(a) {
		return diacriticsMap[a] || a;
	});
}

function getStyleProperty(item, styleContextStack, property, defaultValue) {
	var value;

	if (item[property] !== undefined && item[property] !== null) {
		// item defines this property
		return item[property];
	}

	if (!styleContextStack) return defaultValue;

	styleContextStack.auto(item, function() {
		value = styleContextStack.getProperty(property);
	});

	if (value !== null && value !== undefined) {
		return value;
	} else {
		return defaultValue;
	}
}

function measure(fontProvider, textArray, styleContextStack) {
	var normalized = normalizeTextArray(textArray);
	//add by LPF text_indent属性，用于首行缩进，原作者的代码中没有这个功能
	var textIndent = {
		isFirstLine:true
	};

	normalized.forEach(function(item) {
		var fontName = getStyleProperty(item, styleContextStack, 'font', 'Roboto');
		var fontSize = getStyleProperty(item, styleContextStack, 'fontSize', 12);
		var bold = getStyleProperty(item, styleContextStack, 'bold', false);
		var italics = getStyleProperty(item, styleContextStack, 'italics', false);
		var color = getStyleProperty(item, styleContextStack, 'color', 'black');
		var decoration = getStyleProperty(item, styleContextStack, 'decoration', null);
		var decorationColor = getStyleProperty(item, styleContextStack, 'decorationColor', null);
		var decorationStyle = getStyleProperty(item, styleContextStack, 'decorationStyle', null);
		var background = getStyleProperty(item, styleContextStack, 'background', null);
		var lineHeight = getStyleProperty(item, styleContextStack, 'lineHeight', 1);

		var font = fontProvider.provideFont(fontName, bold, italics);

		// TODO: character spacing
		item.width = font.widthOfString(removeDiacritics(item.text), fontSize);
		item.height = font.lineHeight(fontSize) * lineHeight;

		var leadingSpaces = item.text.match(LEADING);
		var trailingSpaces = item.text.match(TRAILING);
		if (leadingSpaces) {
			item.leadingCut = font.widthOfString(leadingSpaces[0], fontSize);
		}
		else {
			item.leadingCut = 0;
		}

		//link added by LPF 完善对文本超链接的支持
		var link = getStyleProperty(item,styleContextStack,'link',null);
		item.link = link;
		//textIndent  added by LPF 具体实现文本首行缩进
		//item['text-indent']有两种设置方式：1）'**px' 这里的px并非指的是像素（借用的是CSS中的单位），而是pdfmake.js中的单元长度。2）'[number]'首行缩进[number]个英文字符的长度
		var text_indent = getStyleProperty(item,styleContextStack,'text-indent',0);
		if(textIndent.isFirstLine){
			if(text_indent.toString().indexOf('px')>0){
				item.leadingCut -= parseInt(text_indent);
			}else{
				if(typeof text_indent == 'number'){
					for(var i=0;i<text_indent;i++){
						item.leadingCut -= font.widthOfString('a',fontSize);
					}
				}
			}
			textIndent.isFirstLine = false;
		}
		//reEdit end

		if (trailingSpaces) {
			item.trailingCut = font.widthOfString(trailingSpaces[0], fontSize);
		}
		else {
			item.trailingCut = 0;
		}

		item.alignment = getStyleProperty(item, styleContextStack, 'alignment', 'left');
		item.font = font;
		item.fontSize = fontSize;
		item.color = color;
		item.decoration = decoration;
		item.decorationColor = decorationColor;
		item.decorationStyle = decorationStyle;
		item.background = background;
	});

	return normalized;
}

/****TESTS**** (add a leading '/' to uncomment)
TextTools.prototype.splitWords = splitWords;
TextTools.prototype.normalizeTextArray = normalizeTextArray;
TextTools.prototype.measure = measure;
// */


module.exports = TextTools;
