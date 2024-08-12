import { LitElement, html, until } from 'https://da.live/deps/lit/lit-all.min.js';
import getSheet from 'https://da.live/blocks/shared/sheet.js';

const sheet = await getSheet('/tools/tags/tag-selector.css');

export default class DaTagSelector extends LitElement {
  static properties = {
    project: { type: String },
    token: { type: String },
    datasource: { type: String },
    iscategory: { type: Boolean },
    displayName: { type: String },
    parent: { type: Object },
  };

  connectedCallback() {
    super.connectedCallback();
    this.shadowRoot.adoptedStyleSheets = [sheet];
  }

  getTagURL() {
    return `https://admin.da.live/source/${this.project.org}/${this.project.repo}/${this.datasource}`;
  }

  tagClicked(e) {
    if (this.iscategory) {
      const tagtext = e.target.innerText;
      const sel = document.querySelector('da-tag-selector');
      if (sel) {
        const ts = document.createElement('da-tag-selector');
        ts.project = sel.project;
        ts.token = sel.token;
        ts.datasource = `tools/tagbrowser/${tagtext.toLowerCase()}.json`;
        ts.displayName = tagtext;
        ts.parent = sel;
        sel.parentNode.appendChild(ts);
        sel.parentNode.removeChild(sel);
      }
    } else {
      const { target: { form } } = e;
      if (form) {
        const values = [];

        // eslint-disable-next-line no-restricted-syntax
        for (const item of form.elements) {
          if (item.checked) {
            values.push(item.value);
          }
        }
        const vl = values.join(', ');
        navigator.clipboard.writeText(vl).then(() => {
          const sd = document.querySelector('#copy-status');
          sd.style.opacity = '1';
        }, (err) => {
          // eslint-disable-next-line no-console
          console.error('Async: Could not copy text: ', err);
        });
      }
    }
  }

  // eslint-disable-next-line class-methods-use-this
  upClicked() {
    const sel = document.querySelector('da-tag-selector');
    if (sel) {
      if (sel.parent) {
        const sd = document.querySelector('#copy-status');
        sd.style.opacity = '0';

        sel.parentNode.appendChild(sel.parent);
        sel.parentNode.removeChild(sel);
      }
    }
  }

  async fetchTags() {
    const url = this.getTagURL();

    const opts = {
      headers: {
        Authorization: `Bearer ${this.token}`,
      },
    };
    const resp = await fetch(url, opts);
    const tagData = await resp.json();

    let sheetType;
    let langKey;
    let selection = 'Multiple';
    const md = tagData.metadata;
    if (md) {
      // eslint-disable-next-line no-restricted-syntax
      for (const mditem of md.data) {
        // eslint-disable-next-line default-case
        switch (mditem.Key) {
          case 'Type':
            sheetType = mditem.Value;
            break;
          case 'Default Language':
            langKey = mditem.Value;
            break;
          case 'Selection':
            selection = mditem.Value;
            break;
        }
      }
    } else {
      [sheetType] = Object.keys(tagData.data[0]);
      [langKey] = Object.keys(tagData.data[0]);
    }

    const data = tagData.data.data ? tagData.data.data : tagData.data;
    const values = [];
    data.forEach((el) => {
      const val = el[langKey];
      values.push(val);
    });

    const tagLists = [];
    const inputType = selection === 'Single' ? 'radio' : 'checkbox';
    values.forEach((v) => {
      const li = this.iscategory
        ? html`<li @click="${this.tagClicked}">${v}</li>`
        : html`<li><label><input type="${inputType}" name="sel" value="${v}" @click="${this.tagClicked}">${v}</label></li>`;
      tagLists.push(li);
    });

    this.iscategory = sheetType.toLowerCase() === 'category';
    const uplink = this.iscategory
      ? html``
      : html`<span class="up" @click="${this.upClicked}">↑</span> `;
    return html`<h2>${uplink}${this.displayName}</h2><ul><form>${tagLists}</form></ul>`;
  }

  listTags() {
    return html`${until(this.fetchTags(), html`<p><em>Fetching tags...</em></p>`)}`;
  }

  render() {
    return html`
      ${this.listTags()}
    `;
  }
}

customElements.define('da-tag-selector', DaTagSelector);
