# Chatgpt Prompts

Extract all events in json format and save as json file.

**Example Event:**
```json
{
    "unix_time": 1698364800,
    "recurring_pattern": "NONE",
    "title": "Bachata Explosion Berlin Festival 2023",
    "location": "Berlin, Germany",
    "locationUrl": "https://maps.google.com/?q=Tegeler+Seeterrassen%2C+Wilkestra%C3%9Fe%2C+Berlin%2C+Germany",
    "image_url": "https://latindancecalendar.com/dancecal/wp-content/uploads/Bachata-Explosion-Festival-2023.jpg"
}
```

- Make sure to consider the years. Years are encoded in this way (see example):
  
  `<h2 class="title_header_small">October 2023</h2>`

- This is the html for one event:
```html
<div class="vevent">
...
</div>
```

**Additional Requirements:**

- Convert unix time to unix time.
- Remove unicodes from titles.
- Make downloadable as json file.