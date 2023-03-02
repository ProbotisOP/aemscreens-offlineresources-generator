import fetch from 'node-fetch';

export default class CreateManifest {
  static async createManifest(url, data) {
    const channelPath = data.path;
    const scripts = data.scripts.substring(1, data.scripts.length - 1);
    const styles = data.styles.substring(1, data.styles.length - 1);
    const assets = data.assets.substring(1, data.assets.length - 1);
    const dependencies = data.dependencies.substring(1, data.dependencies.length - 1);
    const inlineImages = data['inline-images'].substring(1, data['inline-images'].length - 1);
    const scriptsList = CreateManifest.getScripts(scripts);
    const stylesList = CreateManifest.getStyles(styles);
    const assetsList = CreateManifest.getAssets(assets);
    const inlineImageList = CreateManifest.getInlineImages(inlineImages);
    const dependenciesList = CreateManifest.getDependencies(dependencies);
    const resources = new Set([...scriptsList,
      ...stylesList, ...assetsList,
      ...inlineImageList, ...dependenciesList]);
    const currentTime = new Date().getTime();
    let manifest = '{\n'
        + '  "version": "3.0",\n'
        + '  "contentDelivery": {\n'
        + '    "providers": [\n'
        + '      {\n'
        + '        "name": "franklin",\n'
        + '        "endpoint": "/"\n'
        + '      }\n'
        + '    ],\n'
        + '    "defaultProvider": "franklin"\n'
        + '  },\n'
        + '  "timestamp": ';
    manifest = `${manifest}${currentTime},\n`;
    const entries = await CreateManifest.createEntries(url, channelPath, resources);
    manifest = `${manifest}${entries}}`;
    return manifest;
  }

  static trimString(item, index, arr) {
    arr[index] = item.substring(1, item.length - 1);
  }

  static trimImagesPath(item, index, arr) {
    arr[index] = item[0] === '.' ? item.substring(1, item.length) : item;
  }

  static getScripts(scripts) {
    if (scripts === '') {
      return [];
    }
    const scriptsArr = scripts.split(',');
    scriptsArr.forEach(CreateManifest.trimString);

    return scriptsArr;
  }

  static getStyles(styles) {
    if (styles === '') {
      return [];
    }
    const stylesArr = styles.split(',');
    stylesArr.forEach(CreateManifest.trimString);

    return stylesArr;
  }

  static getAssets(assets) {
    if (assets === '') {
      return [];
    }
    const assetsArr = assets.split(',');
    assetsArr.forEach(CreateManifest.trimString);
    assetsArr.forEach(CreateManifest.trimImagesPath);

    return assetsArr;
  }

  static getInlineImages(inlineImages) {
    if (inlineImages === '') {
      return [];
    }
    const inlineImagesArr = inlineImages.split(',');
    inlineImagesArr.forEach(CreateManifest.trimString);
    inlineImagesArr.forEach(CreateManifest.trimImagesPath);

    return inlineImagesArr;
  }

  static getDependencies(dependencies) {
    if (dependencies === '') {
      return [];
    }
    const dependenciesArr = dependencies.split(',');
    dependenciesArr.forEach(CreateManifest.trimString);

    return dependenciesArr;
  }

  static isMedia(path) {
    return path.startsWith('/media_');
  }

  static getHashFromMedia(path) {
    return path.substring(7, path.indexOf('.'));
  }

  static async addPage(url, path) {
    const pagePath = url + path;
    const resp = await fetch(pagePath);
    let entry = `{\n"path": "${path}",\n`;
    const date = resp.headers.get('last-modified');
    if (date !== null) {
      entry = `${entry}"timestamp": ${new Date(date).getTime()}\n`;
    }
    entry = `${entry}},\n`;
    return entry;
  }

  static async createEntries(url, path, resources) {
    const resourcesArr = Array.from(resources);
    let entries = '"entries": [\n';
    entries = `${entries}${await CreateManifest.addPage(url, path)}`;
    for (let i = 0; i < resourcesArr.length; i += 1) {
      entries = `${entries}{\n"path": "${resourcesArr[i]}",\n`;
      const resourcePath = `${url}${resourcesArr[i]}`;
      /* eslint-disable no-await-in-loop */
      const resp = await fetch(resourcePath);
      const date = resp.headers.get('last-modified');
      if (date !== null) {
        entries = `${entries}"timestamp": ${new Date(date).getTime()}\n`;
      } else if (CreateManifest.isMedia(resourcesArr[i])) {
        entries = `${entries}"hash": "${CreateManifest.getHashFromMedia(resourcesArr[i])}"\n`;
      }
      entries = `${entries}}`;
      if (i < resourcesArr.length - 1) {
        entries = `${entries},`;
      }
      entries = `${entries}\n`;
    }
    entries = `${entries}]\n`;
    return entries;
  }
}
