/*!
 * Plotter v1.0.0
 * Description: Waterfall Plotter for jQuery
 * Author: Charles Migrino
 * License: MIT
 * Repository: github.com/charlesmigrino
 * Date: 2025-06-19
 */

;(function($) {

  const pluginName = 'plotter';

    /* Constructor */
  class PlotterPlugin {

    constructor(element, optionsOrMethod) {
      const today = new Date();
      this.$element = $(element);
      this.settings = $.extend({
        'startDate': today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0'),
        'rightOffset': 5,
        'leftOffset': 5,
        'headerBackground': '#16a085',
        'placeholderCount': 5,
        'items': [],
        'buttons': [],
        'rightCount': 0,
        'stacked': false,
        'leftCount': 0,
        'saveState': false,
        'onItemUpdate': $.noop,
        'sorter': ([idA, a], [idB, b]) => {
          const aDate = new Date(a['start']);
          const bDate = new Date(b['start']);
          return aDate > bDate ? 1 : (aDate < bDate ? -1 : 0);
        },
        'onExpand': $.noop,
        'highlightDay': 7,
        'columnRenderer': function(dater) {
          return `<span>${ dater.toFormattedString() } </span>`;
        },
      }, optionsOrMethod);
      this.itemWidth = 100 / (this.settings['rightOffset'] + this.settings['leftOffset'] + 1);
      this.textHeight = 14;
      this.columnMap = [];
      this.plotterItems = {};
      this.#init();
    }

    #columnRenderer(dater) {
      return `<div class="${ dater.toCustomString('N') == this.settings['highlightDay'] ? "week-end" : ""}">
                <h3 class="month-name ${ parseInt(dater.toCustomString('j')) == 1 ? "fixed-active" : "" }">${ dater.toCustomString('M') }</h3>
                <h4 class="day-name">${ dater.toCustomString('d') }</h4>
                <div class="weekday-name">${ dater.toCustomString('D') }</div>
              </div>`
    }

    #init() {

      this.settings['dater'] = new Dater(this.settings['startDate']);
      this.settings['stateSave'] = this.settings['stateSave'] === true ? true : false;

      this.$container = this.$element;
      this.$container.addClass('plotter-container').css({
        '--header-bg': this.settings['headerBackground'],
        '--column-bg': this.settings['columnBackground'],
      });
      this.$plotterMain = $(`<div class="plotter-main"></div>`).appendTo(this.$container);
      this.$plotterHeader = $('<div class="plotter-header"></div>').appendTo(this.$plotterMain);
      this.$plotterBody = $('<div class="plotter-body"></div>').appendTo(this.$plotterMain);
      this.$plotterColumn = $('<div class="plotter-column"></div>').appendTo(this.$plotterBody);
      this.$rightCounter = $(`<span class="counter right sticky x-right y-middle"></span>`).appendTo(this.$container);
      this.$leftCounter = $(`<span class="counter left sticky x-left y-middle"></span>`).appendTo(this.$container);
      this.$zoomPanel = $('<div class="zoom-panel sticky x-right y-bottom btn-group"></div>').appendTo(this.$container);
      this.$zoomInBtn = $('<button class="zoom-in btn btn-sm"><i class="fa-solid fa-magnifying-glass-plus fa-fw"></i></button>').appendTo(this.$zoomPanel);
      this.$zoomOutBtn = $('<button class="zoom-out btn btn-sm"><i class="fa-solid fa-magnifying-glass-minus fa-fw"></i></button>').appendTo(this.$zoomPanel);
      this.$textAdjustPanel = $('<div class="text-adjust-panel sticky x-right y-bottom btn-group-vertical"><i class="fa-solid fa-text-height fa-fw text-muted"></i></div>').appendTo(this.$container);
      this.$textIncreaseBtn = $('<button class="text-increase btn btn-sm"><i class="fa-solid fa-circle-plus fa-fw"></i></button>').appendTo(this.$textAdjustPanel);
      this.$textDecreaseBtn = $('<button class="text-decrease btn btn-sm"><i class="fa-solid fa-circle-minus fa-fw"></i></button>').appendTo(this.$textAdjustPanel);
      this.$customControlPanel = $('<div class="control-panel sticky x-left y-bottom btn-group"></div>').appendTo(this.$container);

      this.updateCounters(this.settings['leftCount'], this.settings['rightCount']);

      for (var offset = (-1 * (this.settings['leftOffset'] + this.settings['placeholderCount'])); offset <= (this.settings['rightOffset'] + this.settings['placeholderCount']); offset++) {
        const dater = this.settings['dater'].add(offset);
        const $headerItem = $(`<div class="plotter-header-item">${ this.#columnRenderer(dater) }</div>`).css('order', offset).data('dater', dater);
        const $columnItem = $(`<div class="plotter-column-item">${offset}</div>`).data({
          'offset': offset,
          'dater': dater,
        }).css('order', offset);
        this.columnMap[offset] = $columnItem[0];

        if (dater.toString() == new Dater().toString()) {
          $headerItem.addClass('today');
          $columnItem.addClass('today');
        }

        this.$plotterHeader.append($headerItem);
        this.$plotterColumn.append($columnItem);
      }

      const that = this;
      const zoomStep = 1.5;
      const minZoom = 3;
      const maxZoom = 25;
      const textHeightStep = 1;
      const minTextHeight = 10;
      const maxTextHeight = 16;

      this.$zoomInBtn.click( function() {
        that.itemWidth += zoomStep;
        that.$zoomOutBtn.prop('disabled', false);
        if (that.itemWidth > maxZoom) {
          that.itemWidth = maxZoom;
        }
        that.$zoomInBtn.prop('disabled', that.itemWidth + zoomStep > maxZoom);
        that.$plotterMain.css({
          '--item-width': that.itemWidth + '%',
        }).css({
          '--item-width-px': that.$plotterColumn.find('> *:first-child').outerWidth() + 'px',
        })
      });
      this.$zoomOutBtn.click( function() {
        that.itemWidth -= zoomStep;
        that.$zoomInBtn.prop('disabled', false);
        if (that.itemWidth < minZoom) {
          that.itemWidth = minZoom;
        }
        that.$zoomOutBtn.prop('disabled', that.itemWidth - zoomStep < minZoom);
        that.$plotterMain.css({
          '--item-width': that.itemWidth + '%',
        }).css({
          '--item-width-px': that.$plotterColumn.find('> *:first-child').outerWidth() + 'px',
        })
      });

      this.$textIncreaseBtn.click( function() {
        that.textHeight += textHeightStep;
        that.$textIncreaseBtn.prop('disabled', that.textHeight + textHeightStep > maxTextHeight);
        that.$textDecreaseBtn.prop('disabled', false);
        that.$plotterMain.css({
          '--item-font-size': that.textHeight + 'px',
        });
      });

      this.$textDecreaseBtn.click( function() {
        that.textHeight -= textHeightStep;
        that.$textDecreaseBtn.prop('disabled', that.textHeight - textHeightStep < minTextHeight);
        that.$textIncreaseBtn.prop('disabled', false);
        that.$plotterMain.css({
          '--item-font-size': that.textHeight + 'px',
        });
      });

      if (this.settings['buttons'].length) {
        for (const i in this.settings['buttons']) {
          const btnSetting = this.settings['buttons'][i];
          const $btn = $(`<button type="button" class="btn btn-sm"></button>`);
          if (btnSetting['attr']) {
            $btn.attr(btnSetting['attr']);
          }
          if (btnSetting['className']) {
            $btn.addClass(btnSetting['className']);
          }
          if (btnSetting['content']) {
            $btn.html(btnSetting['content']);
          }
          if (btnSetting['action'] && typeof btnSetting['action'] == 'function') {
            $btn.click( btnSetting['action'] );
          }
          this.$customControlPanel.append($btn);
        }
      }

      this.$plotterMain.css({
        '--item-width': that.itemWidth + '%',
        '--item-font-size': that.textHeight + 'px',
      });

      if (this.settings['stacked'] && this.settings['stacked'] == true) {
        this.$container.addClass('stacked');
      }

      setTimeout( function() {
        that.#setScrollView();
        that.#processItems(that.settings['items']);
        that.#resortItems();

        that.$plotterMain.css({
          '--item-width-px': that.$plotterColumn.find('> *:first-child').outerWidth() + 'px',
        });

        setTimeout( function() {
          that.#attachEvents();
          that.$container.addClass('initialized');
        }, 500 );

      }, 1500);
    }

    #saveState() {
      if (this.settings['stateSave']) {
        const containerId = this.$container.attr('id');
        const storageKey = typeof containerId == 'undefined' ? 'plotter' : `plotter_${containerId}`;
        //localStorage.setItem(storageKey, )
      }
    }

    #repositionStickyElements()
    {
      const containerNode = this.$container[0];
      const coordinates = {
        'x-left': {
          '--sticky-left': `${ containerNode.scrollLeft + 10 }px`,
        },
        'x-right': {
          '--sticky-left': `${ (containerNode.scrollLeft + containerNode.clientWidth) - 10 }px`,
          '--sticky-transform-x': '-100%',
        },
        'x-center': {
          '--sticky-left': `${ containerNode.scrollLeft + (containerNode.clientWidth / 2) }px`,
          '--sticky-transform-x': '-50%',
        },
        'y-top': {
          '--sticky-top': `${ containerNode.scrollTop + 10 }px`,
        },
        'y-bottom': {
          '--sticky-top': `${ (containerNode.scrollTop + containerNode.clientHeight) - 10 }px`,
          '--sticky-transform-y': '-100%',
        },
        'y-middle': {
          '--sticky-top': `${ containerNode.scrollTop + (containerNode.clientHeight / 2) }px`,
          '--sticky-transform-y': '-50%',
        },
      }
      const scrollLeft = this.$container[0].scrollLeft;
      const scrollTop = this.$container[0].scrollTop;
      this.$container.find('> .sticky').each( function(i, elem) {
        const $elem = $(elem);
        for (const coordinate in coordinates) {
          if ($elem.is('.' + coordinate)) {
            $elem.css(coordinates[coordinate]);
          }
        }
      });
    }

    #attachEvents() {
      var that = this;
      var scrollDebouncer, scrollDetect, resizeDebouncer;
      var mouseMoveDebouncer;

      const el = this.$container[0];
      const observer = new ResizeObserver(entries => {
        that.#repositionStickyElements();
        clearTimeout(resizeDebouncer);
        resizeDebouncer = setTimeout(function() {
          that.$plotterMain.css({ '--item-width-px': that.$plotterColumn.find('> *:first-child').outerWidth() + 'px' });
        }, 1000);
      });

      observer.observe(el);

      this.$container.on('scroll', function(e) {
        that.#repositionStickyElements();


        clearTimeout(scrollDebouncer);
        clearTimeout(scrollDetect);

        scrollDebouncer = setTimeout( function() {
          const lastColumn = that.$plotterColumn.find('.plotter-column-item:last-child');

          if (that.$container[0].scrollLeft < 50) {
            that.#expand(-10);
          } else if (that.$container[0].scrollLeft + that.$container.width() > lastColumn[0].offsetLeft) {
            that.#expand(10);
          }

          var lastHeaderItem = null
          $('.plotter-header-item', that.$plotterHeader).each( function(i, headerItem) {
            if (that.$container[0].scrollLeft <= headerItem.offsetLeft) {
              $('.plotter-header-item.active', that.$plotterHeader).removeClass('active');
              $(headerItem).addClass('active');
              return false;
            }
          });
      }, 400);

      $(this).addClass('scrolling');

      scrollDetect = setTimeout( function() {
        that.$container.removeClass('scrolling');
      }, 750);
    });

      this.$container.on('mousedown', '.plotter-item.for-resize', function(e) {
        if (e.button == 0 && (e.target == this || !$(e.target).closest('a,button').length)) {
          $(this).addClass('resizing');
        }
      });

      this.$container.on('mousedown', '.plotter-item:not(.moving,.for-resize,.no-movement)', function(e) {
        if (e.button == 0 && (e.target == this || !$(e.target).closest('a,button').length)) {
          var $node = $(this);
          var $guide = $node.clone();
          $guide.data('original-node', $node);
          //$guide.appendTo(that.$plotterBody);
          $guide.insertAfter($node);
          $guide.addClass('moving');
          $guide.css({
            'top': that.$container.is('.stacked') ? 0 : $node.position().top,
            'left': that.$container[0].scrollLeft + (e.clientX - that.$container[0].getBoundingClientRect().left - 25),
          });
          $node.css('visibility', 'hidden');
        }
      });

      this.$container.on('mousemove', '.plotter-item:not(.moving,.no-resize)', function(e) {
        var curX = e.clientX;
        var $item = $(this);
        if (curX > this.getBoundingClientRect().left && curX < this.getBoundingClientRect().left + 10) {
          $item.addClass('for-resize resize-s');
        } else if (curX > this.getBoundingClientRect().left + (this.clientWidth - 10)) {
          $item.addClass('for-resize resize-e');
        } else {
          $item.removeClass('for-resize resize-s resize-e');
        }
      });

      this.$container.on('mouseout', '.plotter-item:not(.moving,.no-resize)', function(e) {
        $(this).removeClass('for-resize');
      });

      this.$container.on('mousemove', function(e) {
        var curX = e.clientX;
        var curY = e.clientY;
        const gapX = curX - that.$container.data('mouse-x');
        const gapY = curY - that.$container.data('mouse-y');
        that.$container.data({
          'mouse-x': curX,
          'mouse-y': curY,
        });


        const $movingItem = that.$plotterBody.find('.plotter-item.moving').first();

        if ($movingItem.length) {

          that.$container.find('.plotter-item.moving').first().each( function(i, elem) {
            var $elem = $(elem);
            $elem.css({
              'left': elem.offsetLeft + gapX,
              //'top': elem.offsetTop + gapY,
            })

            if (curX > (that.$container[0].getBoundingClientRect().right - 100))  {
              that.$container.animate({
                'scrollLeft': '+=20',
              }, 20, function() {
                $elem.css({
                  'left': elem.offsetLeft + 20,
                });
              });
            }

            /* Auto scroll left
            if (((elem.getBoundingClientRect().left - that.$container[0].getBoundingClientRect().left) < 50 && that.$container[0].scrollLeft > 0)
          || (curX - that.$container[0].getBoundingClientRect().left) < 100) {
              that.$container.animate({
                'scrollLeft': '-=20',
              }, 10);
              $elem.animate({
                'left': '-=20',
              }, 10);
            // Auto scroll right
            } else if (($elem.width() < that.$container.width() && (that.$container[0].getBoundingClientRect().right - elem.getBoundingClientRect().right) < 25 && that.$container[0].scrollLeft < that.$container[0].scrollWidth)
          || (that.$container[0].getBoundingClientRect().right - curX) < 100) {
              that.$container.animate({
                'scrollLeft': '+=20',
              }, 10, function() {
                $elem.css({
                  'left': elem.offsetLeft + 20,
                });
              });
              
            }
            */
          });

          /* Vertical Placement 
          clearTimeout(mouseMoveDebouncer);
          mouseMoveDebouncer = setTimeout( function() {
            const $originalNode = $movingItem.data('original-node') ? $movingItem.data('original-node') : null;
            if ($originalNode) {
              const id = $originalNode.data('id');
              var isChild = false;
              var $items = $();
              if (that.plotterItems[id]['parentId']) {
                isChild = true;
                const parentId = that.plotterItems[id]['parentId'];
                const siblings = that.plotterItems[parentId]['children'];
                for (const childId in siblings) {
                  $items = $items.add(siblings[childId]['node']);
                }
              } else {
                $items = $('.plotter-item:not(.no-movement)', that.$plotterBody);
              }
              var hasMoved = false;
              $($items.get().reverse()).each( function() {
                if (this != $originalNode[0] && curY > (this.getBoundingClientRect().top + (this.clientHeight))) {
                  const $this = $(this);
                  // If a parent is being moved, avoid insertion inside a set of children
                  if (!isChild && $this.next().hasClass('child-item')) {
                    return true;
                  }
                  $originalNode.insertAfter($(this));
                  hasMoved = true;
                  return false;
                }
              });
              if (!hasMoved) {
                $originalNode.insertBefore($items.first());
              }
              
            }
          }, 20);
          End of Vertical Placement */
        }
      });

      this.$container.on('mouseenter', '.plotter-column-item', function(e) {
        const $movingItem = that.$plotterBody.find('.plotter-item.moving').first();
        const $resizingItem = that.$plotterBody.find('.plotter-item.resizing').first();

        if ($resizingItem.length) {
          const itemLeft = parseInt($resizingItem.css('--item-left'));
          const itemSpan = parseInt($resizingItem.css('--item-span'));
          const colOffset = $(e.target).data('offset');
          const firstOffset = that.$plotterColumn.find('.plotter-column-item:first-child').data('offset');
          const itemOffset = firstOffset + itemLeft;
          const distance = itemOffset - colOffset;

          if ($resizingItem.is('.resize-s')) { // Left resize
            $resizingItem.css({
              '--item-left': itemLeft - distance,
              '--item-span': itemSpan + distance <= 0 ? 1 : itemSpan + distance,
            });
          } else if ($resizingItem.is('.resize-e')) { // Right resize
            $resizingItem.css({
              '--item-span': (-1 * distance) + 1 <= 0 ? 1 : (-1 * distance) + 1,
            })
          }
        } else if ($movingItem.length) {
          const colOffset = $(e.target).data('offset');
          const firstOffset = that.$plotterColumn.find('.plotter-column-item:first-child').data('offset');
          const newLeft = colOffset - firstOffset;
          const moveDistance = parseInt($movingItem.data('original-node').css('--item-left')) - newLeft;
          const id = $movingItem.data('original-node').data('id');
          $movingItem.data('original-node').css('--item-left', newLeft);

          // Update children offsets
          if (that.plotterItems[id]['children'].length) {
            that.plotterItems[id]['children'].forEach (childId => {
              const childData = that.plotterItems[childId];
              const $childNode = $(childData['node']);
              const lastLeft = parseInt($childNode.css('--item-left'));
              const newLeft = lastLeft - moveDistance;
              $childNode.css('--item-left', newLeft);
            });
          }
        }
      });

      this.$container.on('mouseup mouseleave', function(e) {
        that.$container.find('.plotter-item.moving,.plotter-item.resizing').each( function() {
          var $elem = $(this);
          if ($elem.is('.resizing')) {
            $elem.removeClass('resizing resize-e resize-s');
            that.#updateItemOffset($elem);
          } else if ($elem.is('.moving')) {
            var $originalNode = $elem.data('original-node');
            that.#updateItemOffset($originalNode);
            $originalNode.css('visibility', 'visible');
            $elem.remove();
          }
        });
      });
    }

    #setScrollView(targetOffset, targetTop) {
      var targetOffset = typeof targetOffset == 'undefined' ? 0 : targetOffset;
      var targetTop = typeof targetTop == 'undefined' ? 0 : targetTop;
      var that = this;
      clearTimeout(this.scrollerDebouncer);
      this.scrollerDebouncer = setTimeout(function() {
        var animateRules = {
          'scrollLeft': that.columnMap[targetOffset].offsetLeft - (that.$container[0].clientWidth / 2) + that.columnMap[targetOffset].clientWidth,
        };
        if (parseInt(targetTop) >= 0) {
          animateRules['scrollTop'] = targetTop;
        }

        that.$container.animate(animateRules, 1250);
      }, 300);
    };

    #getDaysDiff(date1, date2) {
      const d1 = new Date(date1);
      const d2 = new Date(date2);

      const timeDifference = d1 - d2;
      const daysDifference = timeDifference / (1000 * 3600 * 24);
      return daysDifference;
    };

    #processItems(items, draw) {
      draw = draw || true;
      for (const i in items) {
        var item = items[i];
        var startOffset = this.#getDaysDiff(item['start'], this.settings['startDate']);
        var spanOffset = this.#getDaysDiff(item['end'], item['start']);
        
        if (spanOffset >= 0) {
          spanOffset += 1;
          item['startOffset'] = startOffset;
          item['spanOffset'] = spanOffset;

          // Check if date is currently visible on timeline, if not let it render on expand
          const columnMapKeys = Object.keys(this.columnMap);
          if (typeof this.columnMap[startOffset] != 'undefined' || typeof this.columnMap[startOffset + spanOffset] != 'undefined' || (startOffset < parseInt(columnMapKeys[0]) && startOffset + spanOffset > parseInt(columnMapKeys[columnMapKeys.length - 1]))) {
            if (draw) {
              const node = this.#drawItem(item);
              item['node'] = node;
            } else {
              item['node'] = null;
            }
          } else { // If offsets are not yet visible on timeline, draw item on edge with 0 width
            if (draw) {
              item['spanOffset'] = 0;
              const node = this.#drawItem(item);
              item['node'] = node;
            } else {
              item['node'] = null;
            }
          }

          item['children'] = [];

          this.plotterItems[item['id']] = item;
          this.setVisibility(item['id'], item['visible'] !== false);


          if (item['parentId']) {
            const parentId = item['parentId'];
            this.linkItem(parentId, item['id']);
          } else { // Make drawer item
            //const drawerItemId = `drawer_item_${ item['id'] }`;
            //const $drawerItem = $(`<div class="drawer-item" id="${ drawerItemId }">${ item['id'] }</div>`).appendTo(this.$plotterBody);
          }
        }
      }
    };

    #drawItem(itemData) {
      var $node = $(`<div class="plotter-item"></div>`);

      if (itemData['content']) {
        if (itemData['content'] instanceof jQuery) {
          $node.empty().append(itemData['content']);
        } else {
          $node.html(itemData['content']);
        }
      } else if (this.settings['itemRenderer'] && typeof this.settings['itemRenderer'] == 'function') {
        $node.html(this.settings['itemRenderer'](itemData['data']));
      }
      if (itemData['className']) {
        $node.addClass(itemData['className']);
      }
      if (itemData['backgroundColor']) {
        $node.css('--item-bg', itemData['backgroundColor']);
      }
      if (itemData['foregroundColor']) {
        $node.css('--item-fg', itemData['foregroundColor']);
      }
      if (itemData['hasShadow'] === false) {
        $node.css('--item-box-shadow', 'none');
      }
      if (itemData['resizable'] === false) {
        $node.addClass('no-resize');
      } else {
        $node.append('<i class="side-handle start"></i><i class="side-handle end"></i>')
      }
      if (itemData['movable'] === false) {
        $node.addClass('no-movement');
      }

      //if (typeof this.columnMap[itemData['startOffset']] != 'undefined' || typeof this.columnMap[itemData['spanOffset']]) {
        if (typeof this.plotterItems[itemData['id']] != 'undefined' && typeof this.plotterItems[itemData['id']]['node'] != 'undefined' && this.plotterItems[itemData['id']]['node'] instanceof HTMLElement) {
          $(this.plotterItems[itemData['id']]['node']).replaceWith($node);
        } else {
          $node.appendTo(this.$plotterBody);
        }

        this.#replotItem($node, itemData);

        $node.attr({
          'data-id': itemData['id'],
        }).data({
          'id': itemData['id'],
        })

        return $node[0];
        /*
      } else {
        return null;
      }
        */
    };

    #replotItem($node, itemData) {
      /*
        Calculate for the offset position of the start date. If Start Date is not yet plotted on the board,
        then start with the first offset
      */
      var itemLeft, plottedStartOffset, actualSpanOffset = itemData['spanOffset'];
      var firstOffset = this.$plotterColumn.find('.plotter-column-item:first-child').data('offset');
      var lastOffset = this.$plotterColumn.find('.plotter-column-item:last-child').data('offset');
      
      if (typeof this.columnMap[itemData['startOffset']] == 'undefined') {
        itemLeft = itemData['startOffset'] > 0 ? (lastOffset - firstOffset) : -1;
        if (actualSpanOffset != 0) {
          actualSpanOffset -= firstOffset - itemData['startOffset'];
        }
      } else {
        itemLeft = itemData['startOffset'] - firstOffset;
      }
      $node.css('--item-left', itemLeft);
      plottedStartOffset = firstOffset + itemLeft;

      /* 
        Check if the End Date is currently plotted
        If not, then plot the bar up to the last available offset
      */

      if (actualSpanOffset != 0 && typeof this.columnMap[plottedStartOffset + actualSpanOffset] == 'undefined') {
        actualSpanOffset = lastOffset - firstOffset;
      }
      $node.css('--item-span', actualSpanOffset);

      /*
      if ((plottedStartOffset + itemData['spanOffset']) > lastOffset) {
        $node.css('--item-span', (lastOffset - plottedStartOffset) + 1);
      } else {
        console.log(itemData['data']['project_name'] + ':  ' + itemData['spanOffset'] + ' - ' + (firstOffset - itemData['startOffset']));
        $node.css('--item-span', typeof this.columnMap[itemData['startOffset']] == 'undefined' ? itemData['spanOffset'] - (firstOffset - itemData['startOffset']) : itemData['spanOffset']);
      }
      */
    };

    #recalculateOffsets() {
      const that = this;
      this.$plotterBody.find('.plotter-item:not(.moving)').each( function(i, node) {
        const $node = $(node);
        const id = $node.data('id');
        const itemData = that.plotterItems[id];

        if (itemData) {
          that.#replotItem($node, itemData);
        } else {
          $item.remove();
        }

      });
    };

    #initiateItemSync(id, failBack)
    {
      failBack = typeof failBack == 'function' ? failBack : $.noop;
      clearTimeout(this.plotterItems[id]['updateDebouncer']);
      const that = this;
      this.plotterItems[id]['updateDebouncer'] = setTimeout( function() {
        const $node = $(that.plotterItems[id]['node']);
        $node.addClass('updating');
        const mode = that.settings['onItemUpdate'](that.plotterItems[id]['start'], that.plotterItems[id]['end'], that.plotterItems[id]['data'], function(newData) {
          $node.removeClass('updating');
          that.plotterItems[id]['data'] = typeof newData == 'object' ? newData : that.plotterItems[id]['data'];
          if (typeof that.settings['itemRenderer'] == 'function') {
            $node.html(that.settings['itemRenderer'](that.plotterItems[id]['data'], true));
            if (!$node.hasClass('no-resize')) {
              $node.append('<i class="side-handle start"></i><i class="side-handle end"></i>');
            }
          }
          that.#resortItems();
        }, function() {
          $node.removeClass('updating');
          failBack();
        });
        if (mode === true) {
          $node.removeClass('updating');
          $node.html(that.settings['itemRenderer'](that.plotterItems[id]['data'], true));
          if (!$node.hasClass('no-resize')) {
            $node.append('<i class="side-handle start"></i><i class="side-handle end"></i>');
          }
          that.#resortItems();
        } else if (mode === false) {
          $node.removeClass('updating');
          failBack();
        }
      }, 1000);
    }

    #resortItems()
    {
      clearTimeout( this.$container.data('resortDebouncer') );
      if (typeof this.settings['sorter'] == 'function') {
        const that = this;
        this.$container.data('resortDebouncer', setTimeout( () => {
            const sortItems = [];
            for (const i in that.plotterItems) {
              const $node = $(that.plotterItems[i]['node']);
              if ($node.length && !$node.is('.moving,.resizing') && !$node.is('.child-item')) {
                const id = that.plotterItems[i]['id'];
                sortItems.push([id, that.item(id)]);
              }
            }
            sortItems.sort(that.settings['sorter']);
            $.each( sortItems, (orderIndex, [id, itemData]) => {
              $(that.plotterItems[id]['node']).css('--item-order', orderIndex + 1);
              if (that.plotterItems[id]['children'].length) {
                that.plotterItems[id]['children'].forEach( (childId) => {
                  $(that.plotterItems[childId]['node']).css('--item-order', orderIndex + 1);
                });
              }
            });
        }, 300 ));
      }
    }

    #updateItemOffset($node) {
      const id = $node.data('id');
      var nodeLeft = parseInt($node.css('--item-left'));
      const nodeSpan = this.plotterItems[id]['spanOffset'];
      const firstOffset = this.$plotterColumn.find('.plotter-column-item:first-child').data('offset');

      /* Limit movement to parent */
      if (this.plotterItems[id]['parentId']) {
        const parentId = this.plotterItems[id]['parentId'];
        const $parentNode = $(this.plotterItems[parentId]['node']);
        const parentNodeLeft = parseInt($parentNode.css('--item-left'));
        
        if (nodeLeft <= parentNodeLeft) {
          nodeLeft = parentNodeLeft + 1;
          $node.css('--item-left', parentNodeLeft + 1);
          this.#setScrollView(firstOffset + nodeLeft);
        }

        const distanceOffset = (parseInt($node.css('--item-left')) - parseInt($parentNode.css('--item-left'))) - 1;
        $node.css({ '--child-offset': distanceOffset });

      }

      const dataComp = $.extend({}, this.plotterItems[id]);
      var nodeOffset = firstOffset + nodeLeft;

      var plottedOffsets = Object.keys(this.columnMap);
      for (const i in plottedOffsets) {
        plottedOffsets[i] = parseInt(plottedOffsets[i]);
      }
  
      const maxPlottedOffset = Math.max(...plottedOffsets);
      const minPlottedOffset = Math.min(...plottedOffsets);

      if (nodeOffset > maxPlottedOffset) { // Calculate new date if offset goes higher than plotted columns
        const diffOffset = nodeOffset - maxPlottedOffset;
        this.plotterItems[id]['start'] = $(this.columnMap[maxPlottedOffset]).data('dater').add(diffOffset).toString();
      } else if (nodeOffset < minPlottedOffset) { // Calculate new date if offest goes lower than plotted columns
        const diffOffset = minPlottedOffset - nodeOffset;
        this.plotterItems[id]['start'] = $(this.columnMap[minPlottedOffset]).data('dater').subtract(diffOffset).toString();
      } else { // Calculate new start date within plotted columns
        this.plotterItems[id]['start'] = $(this.columnMap[nodeOffset]).data('dater').toString();
      }
      
      this.plotterItems[id]['end'] = new Dater(this.plotterItems[id]['start']).add(nodeSpan - 1).toString();
      this.plotterItems[id]['spanOffset'] = nodeSpan;
      this.plotterItems[id]['startOffset'] = this.#getDaysDiff(this.plotterItems[id]['start'], $(this.columnMap[0]).data('dater').toString());


      // Update offsets for children as well
      if (this.plotterItems[id]['children'].length) {
        this.plotterItems[id]['children'].reverse().forEach( (childId) => { 
          const $childNode = $(this.plotterItems[childId]['node']);
          $childNode.insertAfter($node);
          this.#updateItemOffset($childNode);
        });
      }

      if (JSON.stringify(this.plotterItems[id]) != JSON.stringify(dataComp)) {
        const that = this;
        this.#initiateItemSync(id, function() {
          that.plotterItems[id] = dataComp;
          that.#replotItem($node, dataComp);
        });
      }
    };

    #expand(offsets) {
      var $firstColumn = this.$plotterColumn.find('.plotter-column-item:first-child');
      var $lastColumn = this.$plotterColumn.find('.plotter-column-item:last-child');
      var negater = offsets > 0 ? 1 : -1;
      var baseOffset = negater > 0 ? this.$plotterColumn.find('.plotter-column-item:last-child').data('offset') : this.$plotterColumn.find('.plotter-column-item:first-child').data('offset')
      var firstDate, lastDate;
      var movingItem = this.$plotterBody.find('.plotter-item.moving');

      for (var i = 1; i <= Math.abs(offsets); i++) {
        var newOffset = baseOffset + (negater * i);
        const dater = this.settings['dater'].add(newOffset);
        const $headerItem = $(`<div class="plotter-header-item">${ this.#columnRenderer(dater) }</div>`).css('order', newOffset).data('dater', dater);
        const $columnItem = $(`<div class="plotter-column-item">${newOffset}</div>`).data({
          'offset': newOffset,
          'dater': dater,
        }).css('order', newOffset);

        if (negater > 0) {
          this.$plotterHeader.append($headerItem);
          this.$plotterColumn.append($columnItem);
        } else {
          this.$plotterHeader.prepend($headerItem);
          this.$plotterColumn.prepend($columnItem);
        }
        this.columnMap[newOffset] = $columnItem[0];
        if (i == 1) {
          firstDate = dater.toString();
        } else if (i == Math.abs(offsets)) {
          lastDate = dater.toString();
        }
      }

      this.#recalculateOffsets();
      if (negater > 0) {
        this.settings['onExpand'](firstDate, lastDate, 'right');
      } else {
        if (movingItem.length) {
          movingItem.css('left', parseInt(movingItem.css('left')) + ((i - 1) * (this.$container.width() * (this.itemWidth / 100))));
        }
        this.settings['onExpand'](lastDate, firstDate, 'left');
      }


      if (negater < 0) {
        this.$container[0].scrollLeft = $firstColumn[0].offsetLeft;
      }
    }

    /* Public Methods */

    moveItem(id, date)
    {
      if (this.plotterItems[id]) {
        const newOffset = this.dater.daysDiff(date);
        const spanOffset = this.plotterItems[id]['spanOffset'];
        const firstOffset = this.$plotterColumn.find('.plotter-column-item:first-child').data('offset');
        
        if (this.columnMap[newOffset]) {
          const itemLeft = newOffset - firstOffset;
          const $node = $(this.plotterItems[id]['node']);
          $node.css('--item-left', itemLeft);
          this.#updateItemOffset($node);
        } else if (this.columnMap[newOffset + spanOffset]) {
          $node.css('--item-left', itemLeft);
          $node.css('--item-width', Math.abs(firstOffset - newOffset));
          this.#updateItemOffset($node);
        } else {
          console.log('Could not move item. Date set is not plottable or not yet plotted.')
        }
      }
    }

    addItems(items, triggerUpdate)
    {
      /* Item structure
        id: '',
        start: 2025-04-01,
        end: 2025-04-02,
        content: '', (Optional if itemRenderer is defined)
      */

      this.#processItems(items);
      if (triggerUpdate && triggerUpdate === true) {
        for (var i in items) {
          const id = items[i]['id'];
          if (this.plotterItems[id]) {
            this.#initiateItemSync(id);
          }
        }

        const lastId = items[i]['id'];
        const firstOffset = this.$plotterColumn.find('.plotter-column-item:first-child').data('offset');
        const leftOffset = parseInt($(this.plotterItems[lastId]['node']).css('--item-left'));
        this.#setScrollView(firstOffset + leftOffset, this.plotterItems[lastId]['node'].scrollTop + this.plotterItems[lastId]['node'].clientHeight);
      } else {
        this.#resortItems();
      }
    }

    linkItem(parentId, childId)
    {
      if (this.plotterItems[parentId] && this.plotterItems[childId]) {
        var $children = $();
        // Remove old parent if previously linked
        if (this.plotterItems[childId]['parentId']) {
          const previousParentId = this.plotterItems[childId]['parentId'];
          const findIndex = this.plotterItems[previousParentId]['children'].indexOf(childId);
          if (findIndex > -1) {
            this.plotterItems[previousParentId]['children'].splice(findIndex, 1);
          }
        }
        this.plotterItems[childId]['parentId'] = parentId;
        this.plotterItems[parentId]['children'].push(childId);
        $(this.plotterItems[childId]['node']).addClass('child-item');
        $(this.plotterItems[parentId]['node']).addClass('has-child');

        const $parentNode = $(this.plotterItems[parentId]['node']);
        const itemOrder = $parentNode.css('--item-order') == "" ? "auto" : parseInt($parentNode.css('--item-order'));
        /*
        const parentIndex = $('.has-child').index($parentNode) + 1;
        $parentNode.css({ '--item-top': parentIndex });
        */

        this.plotterItems[parentId]['children'].reverse().forEach( (subChildId) => {
          const $childNode = $(this.plotterItems[subChildId]['node']);
          const distanceOffset = (parseInt($childNode.css('--item-left')) - parseInt($(this.plotterItems[parentId]['node']).css('--item-left'))) - 1;
          $childNode.css({
            '--child-offset': distanceOffset,
            '--item-order': itemOrder,
            //'--parent-item-top': parentIndex,
          });
          $children = $children.add($childNode);
        });
        $children.insertAfter($(this.plotterItems[parentId]['node']));
      } else {
        console.log('Could not link. Missing or invalid indexes.');
      }
    }

    setVisibility(id, visible)
    {
      if (this.plotterItems[id]) {
        const $node = $(this.plotterItems[id]['node']);
        if (visible) {
          $node.show();
        } else {
          $node.hide();
        }
        this.plotterItems[id]['visible'] = visible;

        if (Array.isArray(this.plotterItems[id]['children']) && this.plotterItems[id]['children'].length) {
          const childrenIds = Array.isArray(this.plotterItems[id]['children']) && this.
          plotterItems[id]['children'].length ? this.plotterItems[id]['children'] : [];
          const that = this;
          childrenIds.forEach( (childId) => {
            if (that.plotterItems[childId]) {
              const $childNode = $(that.plotterItems[childId]['node']);
              if (visible) {
                $childNode.show();
              } else {
                $childNode.hide();
              }
              that.plotterItems[childId]['visible'] = visible;
            }
          });
        }
      }
    }

    removeItem(id)
    {
      if (this.plotterItems[id]) {
        $(this.plotterItems[id]['node']).remove();
        var children = this.plotterItems[id]['children'];
        if (children.length) {
          this.plotterItems[id]['children'].forEach( (childId) => {
            this.removeItem(childId);
          });
        }
        if (this.plotterItems[id]['parentId']) {
          const parentId = this.plotterItems[id]['parentId'];
          const findIndex = this.plotterItems[parentId]['children'].indexOf(id);
          if (findIndex > -1) {
            this.plotterItems[parentId]['children'].splice(findIndex, 1);
          }
          if (!this.plotterItems[parentId]['children'].length) {
              $(this.plotterItems[parentId]['node']).removeClass('has-child');
          }
        }

        delete this.plotterItems[id];
      }
    }

    updateCounters(left, right)
    {
      if (left !== null) {
        if (left == 0) {
          this.$leftCounter.empty();
        } else {
          this.$leftCounter.text(left);
        }
      }

      if (right !== null) {
        if (right == 0) {
          this.$rightCounter.empty();
        } else {
          this.$rightCounter.text(right);
        }
      }
    }

    getHeaderNode(date)
    {
      const offset = new Dater(date).daysDiff(this.settings['dater']);
      if (this.columnMap[offset]) {
        if (offset == 0) {
          return this.$plotterHeader.find('.plotter-header-item.today')[0];
        } else if (offset > 0) {
          return this.$plotterHeader.find('.plotter-header-item.today').nextAll().eq(offset - 1)[0];
        } else if (offset < 0) {
          return this.$plotterHeader.find('.plotter-header-item.today').prevAll().eq(Math.abs(offset - 1))[0];
        }
      } else {
        return null;
      }
    }

    getItemNode(id)
    {
      return this.plotterItems[id] && this.plotterItems[id]['node'] ? this.plotterItems[id]['node'] : null;
    }

    updateData(id, newData)
    {
      if (this.plotterItems[id]) {
        this.plotterItems[id]['data'] = $.extend({}, this.plotterItems[id]['data'], newData);
      }
    }

    item(id)
    {
      return this.plotterItems[id] ? $.extend({ 
        'start': this.plotterItems[id]['start'],
        'end': this.plotterItems[id]['end'],
       }, this.plotterItems[id]['data']) : null;
    }

    items()
    {
      var items = {};
      for (var id in this.plotterItems) {
        items[id] = this.plotterItems[id]['data'];
        items[id]['start'] = this.plotterItems[id]['start'];
        items[id]['end'] = this.plotterItems[id]['end'];
      }
      return items;
    }

    isDateRangeVisible(startDateStr, endDateStr)
    {
      const firstOffset = this.$plotterColumn.find('.plotter-column-item:first-child').data('offset');
      const lastOffset = this.$plotterColumn.find('.plotter-column-item:last-child').data('offset');
      const firstDate = new Date(this.settings['dater'].add(firstOffset).toString());
      const lastDate = new Date(this.settings['dater'].add(lastOffset).toString());
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      return (startDate >= firstDate && startDate <= lastDate) || (endDate >= firstDate && endDate <= lastDate);
    }

    highlightDates(start, end)
    {
      const firstOffset = this.$plotterColumn.find('.plotter-column-item:first-child').data('offset');
      const lastOffset = this.$plotterColumn.find('.plotter-column-item:last-child').data('offset');
      const firstDate = new Date(this.settings['dater'].add(firstOffset).toString());
      const lastDate = new Date(this.settings['dater'].add(lastOffset).toString());
      const startDate = new Date(start);
      const endDate = new Date(end);
      if (this.isDateRangeVisible(start, end)) {
        const firstHighlightOffset = startDate < firstDate ? firstOffset : firstOffset + new Dater(start).daysDiff(firstDate);
        const lastHighlightOffset = endDate > lastDate ? lastOffset : lastOffset - new Dater(lastDate).daysDiff(end);
        if (firstHighlightOffset <= lastHighlightOffset) {
          const midOffset = firstHighlightOffset + parseInt((lastHighlightOffset - firstHighlightOffset) / 2);
          this.#setScrollView(midOffset);
          var $highlightNodes = $();
          for (var i = firstHighlightOffset; i <= lastHighlightOffset; i++) {
            $highlightNodes = $highlightNodes.add($(this.columnMap[i]));
          }
          $highlightNodes.removeClass('highlight');
          setTimeout( function() {
            $highlightNodes.addClass('highlight');
          }, 100);
        }
      } else {
        console.log('Dates to highlight beyond current view.');
      }
    }

    getCurrentPlottedView()
    {
      const $firstColumn = this.$plotterColumn.find('.plotter-column-item:first-child');
      const $lastColumn = this.$plotterColumn.find('.plotter-column-item:last-child');
      return [$firstColumn.data('dater'), $lastColumn.data('dater')];
    }

    getCurrentDateView()
    {
      const itemFixedWidth = (this.$container.width() * (this.itemWidth / 100));
      var firstVisibleIndex = Math.round(this.$container[0].scrollLeft / itemFixedWidth);
      var lastVisibleIndex = Math.floor(this.$container.width() / itemFixedWidth) + firstVisibleIndex;
      var $columns = $('.plotter-column-item', this.$plotterColumn);
      return [$columns.eq( firstVisibleIndex ).data('dater'), $columns.eq( lastVisibleIndex).data('dater') ];
    }

  };

  $.fn.plotter = function(optionsOrMethod, ...args) {

    return this.each(function() {
      let instance = $.data(this, 'plugin_' + pluginName);

      if (!instance) {
        instance = new PlotterPlugin(this, optionsOrMethod);
        $.data(this, 'plugin_' + pluginName, instance);
      } else if (typeof optionsOrMethod === 'string' && typeof instance[optionsOrMethod] === 'function') {
        instance[optionsOrMethod](...args);
      }

    });
  };

})(jQuery);