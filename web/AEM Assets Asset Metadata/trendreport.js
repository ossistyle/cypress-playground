/*
 * ADOBE CONFIDENTIAL
 * __________________
 *
 *  Copyright 2016 Adobe Systems Incorporated
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 */

(function(window, document, moment, $) {
    "use strict";
    if (!window.AssetTrendReportProvider) {
        var AssetTrendReportProvider = function(assetPath, containerDiv) {
            this.assetPath = assetPath;
            this.containerDiv = containerDiv;
            this.enclosedContentDiv = this.containerDiv.find(".content");

            this.formatDate = function(date) {
                var d = new Date(date);
                var month = "" + (d.getMonth() + 1);
                var day = "" + d.getDate();
                var year = d.getFullYear();

                if (month.length < 2) {
                    month = "0" + month;
                }
                if (day.length < 2) {
                    day = "0" + day;
                }

                return [ year, month, day ].join("-");
            };

            this.hideWaitingIndication = function() {
                var waitIndiactor = this.enclosedContentDiv.find("coral-wait");
                if (waitIndiactor) {
                    waitIndiactor.remove();
                }
            };

            this.showWaitingIndication = function() {
                var waitIndiactor = this.enclosedContentDiv.find("coral-wait");
                if (waitIndiactor) {
                    $(this.enclosedContentDiv).append("<coral-wait centered size = 'L'/>");
                }
            };
            this.showMessage = function(msg) {
                var msgContainer = this.enclosedContentDiv.find(".msg");
                msgContainer.show();
                msgContainer.html(msg);
            };

            this.clearMessage = function() {
                var msgContainer = this.enclosedContentDiv.find(".msg");
                msgContainer.hide();
            };

            this.mapAnalyticsResponseToDVFormat = function(impressionResult, clickResult) {
                var result = {};
                var values = [];
                var dates = [];
                var series = [];
                var dateSplit;
                var date;
                var period;
                var periodLen;
                var metricData;

                if (impressionResult) {
                    if (impressionResult["period"] && impressionResult["metric"]) {
                        period = impressionResult["period"];
                        periodLen = period.length;
                        metricData = impressionResult["metric"];
                        for (var i = 0; i < periodLen; i++) {
                            values.push(metricData.data[i]);
                            series.push(Granite.I18n.get("Impressions"));
                            dateSplit = period[i].split("-");
                            date = new Date(dateSplit[0], dateSplit[1] - 1, dateSplit[2]);
                            dates.push(date);
                        }
                    }
                }

                if (clickResult) {
                    if (clickResult["period"] && clickResult["metric"]) {
                        period = clickResult["period"];
                        periodLen = period.length;
                        metricData = clickResult["metric"];
                        for (var j = 0; j < periodLen; j++) {
                            values.push(metricData.data[j]);
                            series.push(Granite.I18n.get("Clicks"));
                            dateSplit = period[j].split("-");
                            date = new Date(dateSplit[0], dateSplit[1] - 1, dateSplit[2]);
                            dates.push(date);
                        }
                    }
                }

                result["values"] = values;
                result["dates"] = dates;
                result["series"] = series;
                return result;
            };

            this.getAssetClickTrendedReport = function(startDate, endDate, granularity, successHandler, errorHandler) {
                $.ajax({
                    type: "GET",
                    url: document.location.origin + this.assetPath + ".performanceData.json?metric=clicks&from-date=" +
                    this.formatDate(startDate) + "&to-date=" + this.formatDate(endDate) + "&granularity=" +
                    granularity,
                    success: function(response) {
                        successHandler(response);
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        errorHandler(jqXHR, textStatus, errorThrown);
                    }
                });
            };

            this.getAssetImpressionTrendedReport = function(startDate,
                endDate, granularity, successHandler, errorHandler) {
                $.ajax({
                    type: "GET",
                    url: document.location.origin + this.assetPath +
                    ".performanceData.json?metric=impressions&from-date=" + this.formatDate(startDate) +
                    "&to-date=" + this.formatDate(endDate) + "&granularity=" + granularity,
                    success: function(response) {
                        successHandler(response);
                    },
                    error: function(jqXHR, textStatus, errorThrown) {
                        errorHandler(jqXHR, textStatus, errorThrown);
                    }
                });
            };

            this.impressionResponseResult;
            this.clickResponseResult;
            this.handleResponse = function(type, response, granularity) {
                if (type === "Clicks") {
                    this.clickResponseResult = response;
                } else if (type === "Impressions") {
                    this.impressionResponseResult = response;
                }

                if (this.clickResponseResult && this.impressionResponseResult) {
                    this.hideWaitingIndication();
                    var result = this.mapAnalyticsResponseToDVFormat(this.impressionResponseResult,
                        this.clickResponseResult);
                    var options = {
                        data: result,
                        parent: this.enclosedContentDiv.get(0),
                        filled: false,
                        interactive: true,
                        autoResize: true,
                        dateGranularity: granularity,
                        mappings: {
                            "x": "dates",
                            "y": "values",
                            "group": "series",
                            "fill": "series"
                        }
                    };
                    window.cloudViz.line(options).render();
                }
            };
        };

        AssetTrendReportProvider.prototype.getAssetPerformanceTrendedReport = function(startDate,
            endDate, granularity) {
            this.clearMessage();
            this.showWaitingIndication();
            this.clickResponseResult = this.impressionResponseResult = undefined;
            var that = this;

            this.getAssetClickTrendedReport(startDate, endDate, granularity,
                function(response) {
                    that.handleResponse("Clicks", response, granularity);
                },
                function(jqXHR, textStatus, errorThrown) {
                    that.hideWaitingIndication();
                    that.showMessage("Failed to load data");
                });

            this.getAssetImpressionTrendedReport(startDate, endDate, granularity,
                function(response) {
                    that.handleResponse("Impressions", response, granularity);
                },
                function(jqXHR, textStatus, errorThrown) {
                    that.hideWaitingIndication();
                    that.showMessage("Failed to load data");
                });
        };
    }

    $(document).ready(function() {
        var containerDivSelector = "#asset-performance-report";
        var containerDiv = $(containerDivSelector);
        var assetPath = containerDiv.attr("data-assetPath");
        var assetTrendReportProvider = new AssetTrendReportProvider(assetPath, containerDiv);

        $(containerDivSelector + " #7-days-report").click(function(event) {
            event.preventDefault();
            var endDate = new Date();
            var startDate = moment().subtract(7, "days").toDate();
            assetTrendReportProvider.getAssetPerformanceTrendedReport(startDate, endDate, "day");
        });

        $(containerDivSelector + " #1-month-report").click(function(event) {
            event.preventDefault();
            var endDate = new Date();
            var startDate = moment().subtract(1, "months").toDate();
            assetTrendReportProvider.getAssetPerformanceTrendedReport(startDate, endDate, "day");
        });

        $(containerDivSelector + " #3-month-report").click(function(event) {
            event.preventDefault();
            var endDate = new Date();
            var startDate = moment().subtract(3, "months").toDate();
            assetTrendReportProvider.getAssetPerformanceTrendedReport(startDate, endDate, "week");
        });

        $(containerDivSelector + " #1-year-report").click(function(event) {
            event.preventDefault();
            var endDate = moment().toDate();
            var startDate = moment().subtract(1, "years").toDate();
            assetTrendReportProvider.getAssetPerformanceTrendedReport(startDate, endDate, "month");
        });
    });
})(window, document, moment, Granite.$);

