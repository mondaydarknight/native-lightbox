

(function(root, factory) {
	if (typeof define === 'function' && define.amd) {
		define([], factory);
	} else if (typeof module === 'object' && module.exports) {
		// Node does not work in CommonJS, but only CommonJS-like environments that support module.exports.
		module.exports = factory();
	} else {
		this.lightbox = factory();
	}
}(this, function factory() {
	
	var DocumentFactory = {
		events: {},
		
		closestEvent(target, callback) {
			return function(event) {				
				event.stopPropagation();
				event.preventDefault();

				var element = event.target.closest(target);
				return element && callback(element);
			};
		},

		on (node, eventName, target, callback) {	
		},
		
		off (node, eventName, target) {
		},
		
		append (node, template) {
			var div = document.createElement('div');

			div.innerHTML = template;

			while (div.children.length > 0) {
				if (div.children[0].tagName === 'LINK') {
					var link = document.createElement('link');

					link.href = div.children[0].href;
					node.appendChild(link);
				}

				node.appendChild(div.children[0]);
			}
		},

		addClass(element, classes = []) {
			var classList = element.classList;
			return classList.add.apply(classList, classes);
		},

		clearClass(element) {
			return element.className = "";
		}
	};

	function Lightbox(options = {}) {
		this.album = [];
		this.currentImageIndex = void 0;
		this.init();
		this.extend(options);
	}

	Lightbox.defaults = {
		albumLabel: 'Image %1 of %2',
		alwaysShowNavOnTouchDevices: false,
		fadeDuration: 600,
		fitImagesInViewport: true,
		imageFadeDuration: 600,
		positionFromTop: 50,
		resizeDuration: 700,
		wrapAround: false,
		disableScrolling: false,
		/**
		 * If the caption data is user submitted or from some other untrusted source, set this to ture to prevent xss and other injection attack.
		 */
		sanitizeTitle: false
	};

	Lightbox.selectors = ['a[rel="lightbox"]', 'area[rel="lightbox"]', 'a[data-lightbox]', 'area[data-lightbox]'];

	Lightbox.template = 
		`<div id="lightbox-overlay" class="lightbox-overlay fade after"></div>
	    <div id="lightbox" class="lightbox fade">
	       	<div class="lightbox-outer">
	       		<div class="lightbox-close-container">
 	     			<a class="lightbox-close"></a>
    	  		</div>
	       		<div class="lightbox-container">
	          		<img class="lightbox-image fade" src="data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==" />
	           		<div class="lightbox-nav">
	           			<a class="arrow-prev" href=""></a>
	          			<a class="arrow-next" href=""></a>
	          		</div>
	          		<div class="lightbox-loader">
	          			<a class="lightbox-cancel"></a>
	       			</div>
	       			<div class="lightbox-indicators"></div>
	      		</div>
      		</div>
      		<div class="lightbox-data-container">
      			<div class="lightbox-data">
      				<div class="lightbox-details">
      					<span class="lightbox-caption"></span>
      					<span class="lightbox-number"></span>
      				</div>      				
      			</div>
      		</div>
      	</div>`;

	Lightbox.prototype.init = function() {
		var self = this;

		function initProcess(event) {
			self.register().build();

			event.type === 'DOMContentLoaded' ? 
			document.removeEventListener('DOMContentLoaded', initProcess, false) : 
			window.removeEventListener('load', initProcess);
		}

		if (document.readyState === 'ready') {
			document.addEventListener('DOMContentLoaded', initProcess, false);
		} else {
			window.addEventListener('load', initProcess, false);
		}
	};

	Lightbox.prototype.extend = function(options) {
		this.options = Object.assign({}, this.constructor.defaults, options);
	}

	Lightbox.prototype.renderImageCountLabel = function(currentImageNum, totalImages) {
		return this.options.albumLabel.replace(/%1/g, currentImageNum.replace(/%2/g, totalImages));
	};

	/**
	 * Hendle the event for addEventListener and removeListener refer to same object 
	 * @todo Origin prototype handleEvent and trigger the event
	 */	 
	Lightbox.prototype.handleEvent = function(event) {
		switch(event.type) {			
			case 'keyup': {
				this.keyboardAction(event);
			};
			case 'resize': {
				this.resizeOverlay();
			};
		}
	};


	/**
	 * Register the event listener in document
	 * Including a[rel="lightbox"] a[data-lightbox] area[data-lightbox]
	 * 
	 * @return this
	 */
	Lightbox.prototype.register = function() {
		for (var i=0; i<this.constructor.selectors.length; i++) {
			var execution = function(element) {
				this.start(element);
				return false;
			}.bind(this);

			document.addEventListener('click', DocumentFactory.closestEvent(this.constructor.selectors[i], execution));
		}

		return this;
	};

	/**
	 * Build html for lightbox and overlay
	 * Attach event handlers to the new DOM elements.
	 */
	Lightbox.prototype.build = function() {
		if (document.querySelector('#lightbox')) {
			return;
		}
				
		function dismissClickEvent(event) {
			event.preventDefault();
			this.end();
			return false;
		}

		function hideLightboxAfterTransitionend(event) {
			if (!event.target.classList.contains('show')) {
				this.overlay.style = this.lightbox.style = this.outer.style = null;
			}
		}

		function changeImageByIndicator(event) {
			event.preventDefault();
			var indicators = [].slice.call(this.outer.querySelectorAll('.lightbox-indicator'));
			var indicatorIndex = indicators.indexOf(event.target);

			if (indicatorIndex == -1 || indicatorIndex === this.currentImageIndex) {
				return;
			}
			return this.changeImage(indicatorIndex);
		}

		function clickLightboxEvent(event) {
			event.target.getAttribute('id') === 'lightbox' && this.end();
			return false;
		}

		function clickPrevButton(event) {
			event.preventDefault();
			return this.currentImageIndex === 0 ? this.changeImage(this.album.length - 1) : this.changeImage(this.currentImageIndex - 1);
		}

		function clickNextButton(event) {
			event.preventDefault();
			return this.currentImageIndex === this.album.length - 1 ? this.changeImage(0) : this.changeImage(this.currentImageIndex + 1);			
		}

		function preventContextMenuAction(event) {
			if (event.which !== 3) {
		 		return;		 			
		 	}

		 	var func = function() {
		 		this.nav.removeEventListener('contextmenu', func);
		 		setTimeout(function() { this.nav['pointer-events'] = 'auto'; }, 0);
		 	}.bind(this);

		 	this.nav.style['pointer-events'] = 'none';
		 	this.lightbox.addEventListener('contextmenu', func);
		}

		DocumentFactory.append(document.body, this.constructor.template);

		this.overlay = document.body.querySelector('#lightbox-overlay')
		this.lightbox = document.body.querySelector('#lightbox');
		this.outer = this.lightbox.querySelector('.lightbox-outer');		
		this.image = this.lightbox.querySelector('.lightbox-image');
		this.nav = this.lightbox.querySelector('.lightbox-nav');
		this.prev = this.lightbox.querySelector('.arrow-prev');
		this.next = this.lightbox.querySelector('.arrow-next');

		var container = this.outer.querySelector('.lightbox-container');
		
		this.containerPadding = {
			top: container.style['padding-top'] || 0,
			right: container.style['padding-right'] || 0,
			bottom: container.style['padding-bottom'] || 0,
			left: container.style['padding-left'] || 0		
		};

		this.imageBorderWidth = {
			top: this.image.style['border-top-width'] || 0,			
			right: this.image.style['border-right-width'] || 0,
			bottom: this.image.style['border-bottom-width'] || 0,
			left: this.image.style['border-left-width'] || 0
		};		

		this.overlay.addEventListener('click', this);

		this.overlay.addEventListener('click', dismissClickEvent.bind(this));
		this.overlay.addEventListener('transitionend', hideLightboxAfterTransitionend.bind(this));
		this.lightbox.addEventListener('click', clickLightboxEvent.bind(this));
		this.lightbox.querySelector('.lightbox-close').addEventListener('click', dismissClickEvent.bind(this));
		this.lightbox.querySelector('.lightbox-indicators').addEventListener('click', changeImageByIndicator.bind(this));
		this.prev.addEventListener('click', clickPrevButton.bind(this));
		this.next.addEventListener('click', clickNextButton.bind(this));
		
		/*
		 	Show context menu for image on right-lcick
			
			There is a div containing the navigation that spans the entire image and lives above of it.
			If you right-click, you are right clicking this div and not the image. This prevents users from 
			saving the image or using other context menu actions with the image.

			To fix this, when we detect the right mouse button is pressed down, but not yet clicked, we set
			pointer-events to none  on the nav div. This is so that the updating right-click event on the next mouseup
			bubble down to the image. Once the right-click / contextmenu event occurs we set the pointer-events back to 
			auto for the div so it can cpature hover and left-click events as usual.
		 */
		this.nav.addEventListener('mousedown', preventContextMenuAction.bind(this));		 		 	
	};

	/**
	 * Show overlay and lightbox if the imageis part a set. add sibling to array
	 *
	 * @note Support both data-lightbox attribute and rel attributee implementations
	 *
	 */
	Lightbox.prototype.start = function(element) {
		var self = this;
		var imageNumber = 0;
		var links = [];

		function addToAlbum(link) {
			self.album.push({
				alt: link.getAttribute('data-alt'),
				link: link.getAttribute('href'),
				title: link.getAttribute('data-title') || link.getAttribute('title')
			});
		}
			
		this.clear();
		// this.setElementVisible(['select', 'obejct', 'embed'], false);
		this.resizeOverlay();
		this.options.disableScrolling && document.documentElement.classList.add('lightbox-scroll-disable');

		window.addEventListener('resize', this);

		var dataLightboxValue = element.getAttribute('data-lightbox');

		if (dataLightboxValue) {
			var links = [].slice.call(document.body.querySelectorAll(element.tagName + '[data-lightbox="'+ dataLightboxValue +'"]'));

			links.forEach(function(link, i) {
				addToAlbum(link);

				if (links[i] === element) {
					imageNumber = i;
				}
			});
		} else if (element.getAttribute('rel') === 'lightbox') {
			addToAlbum(element);
		}

		var {scrollTop, scrollLeft} = this.getScrollPosition();

		this.lightbox.style.top = (scrollTop + this.options.positionFromTop) + 'px';
		this.lightbox.style.left = scrollLeft + 'px';
		this.lightbox.style.display = 'block';
		this.lightbox.classList.add('show');
		this.changeImage(imageNumber);
		this.generateIndicators();
	};

	Lightbox.prototype.setElementVisible = function(selectors = [], isVisible = true) {
		isVisible = isVisible ? 'visible' : 'hidden';

		for (var i=0; i<selectors.length; i++) {
			var elements = [].slice.call(document.querySelectorAll(selectors[i]));

			elements.forEach(function(element) {
				element.style.visibility = isVisible;
			});
		}
	};

	Lightbox.prototype.generateIndicators = function() {
		var indicatorElements = '<a href class="lightbox-indicator"></a>'.repeat(this.album.length);
		this.outer.querySelector('.lightbox-indicators').innerHTML = indicatorElements;
	};

	// Hdie UI elements in preperation for the animated resizing of the lightbox
	Lightbox.prototype.changeImage = function(imageNumber) {
		var self = this;
		
		this.disableKeyboardNav();
		this.overlay.classList.add('show');
		this.image.classList.remove('show');
		// Loading...
		this.lightbox.querySelector('.lightbox-loader').style.display = 'block';	
		this.prev.style.display = this.next.style.display = this.outer.style.display = 'none';
		this.outer.classList.add('animating');

		// When image to show is preloaded, we send the width and height to size sizeContainer
		var preloader = new Image();
		
		preloader.onload = function() {
			this.image.setAttribute('alt', this.album[imageNumber].alt);
			this.image.setAttribute('src', this.album[imageNumber].link);

			this.image.width = preloader.width;
			this.image.height = preloader.height;

			if (this.options.fitImagesInViewport) {
				this.fitImagesInViewport(preloader);
			}
			
			this.resizeContainer(this.image.width, this.image.height);
		}.bind(this);

		preloader.src = this.album[imageNumber].link;
		this.currentImageIndex = imageNumber;
	};


	Lightbox.prototype.fitImagesInViewport = function(preloader) {
		// Fit image inside the viewport
		var { windowWidth, windowHeight } = this.getWindowSize();				
				
		var maxImageHeight = window.innerHeight - this.containerPadding.top - this.containerPadding.bottom - this.imageBorderWidth.top - this.imageBorderWidth.bottom - 120;
		var maxImageWidth = window.innerWidth - this.containerPadding.left - this.containerPadding.right - this.imageBorderWidth.left - this.imageBorderWidth.right - 20;

		// Check the size is larger than max width/height in setting
		if (this.options.maxWidth && this.options.maxWidth < maxImageWidth) {
			maxImageWidth = this.options.maxWidth;
		}

		if (this.options.maxHeight && this.options.maxHeighte < maxImageHeight) {
			maxImageHeight = this.options.maxHeighte;
		}
		
		// Is the current image's width or height is greater than the maxImageWidth or maxImageHeight
    	// option than we need to size down while maintaining the aspect ratio.        
		if (preloader.width <= maxImageHeight && preloader.height <= maxImageWidth) {
			return;
		}

		if ((preloader.width / maxImageWidth) > (preloader.height / maxImageHeight)) {
			this.image.width = maxImageWidth;
			this.image.height = parseInt(preloader.height / (preloader.width / maxImageWidth), 10);		
		} else {					
			this.image.height = maxImageHeight;
			this.image.width = parseInt(preloader.width / (preloader.height / maxImageHeight), 10);			
		}

	};

	/**
	 * Stretch overlay to fit the viewport
	 */
	Lightbox.prototype.resizeOverlay = function() {
		var { windowWidth, windowHeight } = this.getWindowSize();
		this.overlay.style.width = windowWidth + 'px';
		this.overlay.style.height = windowHeight + 'px';
	};

	Lightbox.prototype.getWindowSize = function() {
		return {
			windowWidth: document.body.offsetWidth,
			windowHeight: document.body.offsetHeight
		};
	};

	/**
	 * Get the scroll top, left, right, bottom from html or body
	 * 
	 * @todo Unfortunately, Safari website does not support the scroll positions of <html>, so we need to check body element
	 */
	Lightbox.prototype.getScrollPosition = function() {
		const containerElement = document.scrollingElement || document.documentElement;

		// Math.max(window.pageYOffset, document.documentElement.scrollTop, document.body.scrollTop);

		return {
			scrollTop: containerElement.scrollTop,
			scrollLeft: containerElement.scrollLeft,
			scrollRight: containerElement.scrollRight,
			scrollBottom: containerElement.scrollBottom,
		};
	};

	/**
	 * Animate hte size of the lightbox to fit the image 
	 */
	Lightbox.prototype.resizeContainer = function(imageWidth, imageHeight) {
		var containerWidth = imageWidth + this.containerPadding.left + this.containerPadding.right + this.imageBorderWidth.left + this.imageBorderWidth.right;
		var containerHeight = imageHeight + this.containerPadding.top + this.containerPadding.bottom + this.imageBorderWidth.top + this.imageBorderWidth.bottom;
		
		function postResize() {
			var dataContainer = this.lightbox.querySelector('.lightbox-data-container');
			this.outer.style.width = dataContainer.style.width = containerWidth + 'px';
			this.outer.style.height = this.prev.style.height = this.next.style.height = containerHeight + 'px';			
			this.showImage();
		}

		// outerContainer animate
		this.outer.style.display = 'block';
		postResize.apply(this);
	};

	/**
	 * Display the image
	 */
	Lightbox.prototype.showImage = function(delay = 200) {
		this.outer.classList.remove('animating');
		this.lightbox.querySelector('.lightbox-loader').style.display = 'none';
		this.updateNav();
		this.updateDetails();
		this.preloadNeighboringImages();
		this.refreshCurrentIndicator();
		this.enableKeyboardNav();
		setTimeout(function() { this.image.classList.add('show'); }.bind(this), delay);		
	};

	/**
	 * Display previous and next navigation if appropriate
	 * Check to see if the browser supports touch events. We assume the conservative approach
	 * that mouse hover events are not supported and always show prev / next navigation arrows in image sets.	
	 */
	Lightbox.prototype.updateNav = function() {
		try {
			var alwaysShowNav = this.options.alwaysShowNavOnTouchDevices;			
			document.createEvent('TouchEvent');
		} catch (e) {
		}

		this.nav.classList.add('show');

		if (!this.album.length) {
			return;
		}

		if (this.options.wrapAround) {
			this.next.style.opacity = this.prev.style.opacity = parseInt(alwaysShowNav, 10);
			return this.next.style.display = this.prev.style.display = 'block';	 
		} 		

		if (this.currentImageIndex > 0) {
			this.prev.style.display = 'block';
			this.prev.style.opacity = parseInt(alwaysShowNav, 10);			
		} 

		if (this.currentImageIndex < this.album.length - 1) {
			this.next.style.display = 'block';
			this.next.style.opacity = parseInt(alwaysShowNav, 10);
		}
	};	

	/** 
	 * Enable other clicks in the injected caption html
	 *
	 */
	Lightbox.prototype.updateDetails = function() {
		if (!this.album[this.currentImageIndex].title) {
			return;
		}

		var caption = this.lightbox.querySelector('.lightbox-caption');

		if (this.options.sanitizeTitle) {
			caption.textContent = this.album[this.currentImageIndex].title;
		} else {
			caption.innerHTML = this.album[this.currentImageIndex].title;
		}

		if (caption.querySelector('a')) {
			caption.querySelector('a').onclick = function(event) {
				event.target.getAttribute('target') ? 
				window.open(event.target.getAttribute('href'), event.target.getAttribute('target')) : 
				window.location = event.target.getAttribute('href');
			};
		}
	};

	Lightbox.prototype.preloadNeighboringImages = function() {
		if (this.currentImageIndex < this.album.length -1) {
			var preloadNext = new Image();
			preloadNext.src = this.album[this.currentImageIndex + 1].link;
		}

		if (this.currentImageIndex > 0) {
			var preloadPrev = new Image();
			preloadPrev.src = this.album[this.currentImageIndex - 1].link;
		}
	};

	Lightbox.prototype.refreshCurrentIndicator = function() {				
		var indicators = [].slice.call(this.outer.querySelectorAll('.lightbox-indicator'));

		indicators.forEach(function(indicator) {
			indicator.classList.remove('active');
		});

		indicators[this.currentImageIndex].classList.add('active');
	};

	Lightbox.prototype.enableKeyboardNav = function() {
		document.addEventListener('keyup', this);
	};

	Lightbox.prototype.disableKeyboardNav = function(imageNumber) {
		document.removeEventListener('keyup', this);
	};


	Lightbox.prototype.keyboardAction = function(event) {
		var KEYCODE_ESC = 27;
    	var KEYCODE_LEFTARROW = 37;
    	var KEYCODE_RIGHTARROW = 39;    	
    	var keycode = event.keyCode;
    	var key = String.fromCharCode(keycode).toLowerCase();
    	
    	if (!keycode) {
    		return;
    	}

    	function enablePrevImage() {
    		if (this.currentImageIndex) {
    			this.changeImage(this.currentImageIndex - 1);
    		} else if (this.options.wrapAround && this.album.length) {
    			this.changeImage(this.album.length - 1);
    		}
    	}

    	function enableNextImage() {
    		if (this.currentImageIndex !== this.album.length -1) {
    			this.changeImage(this.currentImageIndex + 1);
    		} else if (this.options.wrapAround && this.album.length) {
    			this.changeImage(0);
    		}
    	}

    	if (keycode === KEYCODE_ESC || key.match(/x|o|c/)) {
    		this.end();
    	} else if (key === 'p' || keycode === KEYCODE_LEFTARROW) {
    		enablePrevImage.call(this);
    	} else if (key === 'n' || keycode === KEYCODE_RIGHTARROW) {
    		enableNextImage.call(this);
    	}
	};

	Lightbox.prototype.clear = function() {
		return this.album = new Array();
	};

	/**
	 * Close time
	 *
	 */
	Lightbox.prototype.end = function() {		
		this.disableKeyboardNav();
		this.lightbox.classList.remove('show');
		this.overlay.classList.remove('show');

		this.lightbox.style.display = 'none';

		window.removeEventListener('resize', this);
		// this.setElementVisible(['select', 'object', 'embed'], false);
		this.options.disableScrolling && document.documentElement.classList.remove('lightbox-scroll-disable');
	};

	return new Lightbox();

}));


