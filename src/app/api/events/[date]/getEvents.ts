import * as cheerio from "cheerio";
import moment from "moment";
import { ScheduledEvent, EventDuration, groupEvents } from "@/UWEvent";

export const getEvents = async (date: String, includeEnded: Boolean = true) => {
  let events: ScheduledEvent[] = [];
  const res = await fetch("http://today.wisc.edu/events/day/" + date);
  const $ = cheerio.load(await res.text());
  let today = $('h1.day-row-header > a').text(); // "Today, November 19, 2023"
  $('div.events-list > ul.day-row > li.event-row').each((i, el) => {
    const title = $(el).find('h3.event-title > a').text();
    let duration;
    if ($(el).find('p:not([class])').text() == "All day") {
      duration = new EventDuration(undefined, undefined);
    }
    else {
      const time = $(el).find('p.event-time').text().replace(/[\s\.]/g, "");
      const timeParts = time.split("-");
      // 9am, 1-4pm, 9:15am, 1:15-4:30pm
      if (timeParts.length == 1) {
        timeParts[1] = timeParts[0];
      }
      const end = moment(timeParts[1], ["h:mma", "ha"]);
      // deal with cases like 1-4pm, 1:15-4:30pm
      if (!timeParts[0].endsWith("m")) {
        timeParts[0] += timeParts[1].substring(timeParts[1].length - 2);
      }
      // don't include events that have already ended 
      if (!includeEnded && end.isBefore(moment())) {
        return;
      }
      const start = moment(timeParts[0], ["h:mma", "ha"]);
      duration = new EventDuration(start, end);
    }
    const subtitle = $(el).find('p.subtitle').text().replace(/[\n\.]/g, "");
    let location = $(el).find('p.event-location').children().toString().replace(/<i class="fa.*?\/i>/g, "");
    location = location.split("<br>").filter(s => s != "").join(" - ");
    location = location.replace(/<i.*?>(.*?)<\/i>/, "$1");
    events.push(new ScheduledEvent(title, subtitle, duration, location));
  });
  return events;
};export const getEventsGrouped = async (date: String, includeEnded: Boolean = true) => {
  let events = await getEvents(date, includeEnded);
  return groupEvents(events);
};

