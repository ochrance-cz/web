find . -name '*.md' -print0 | xargs -0 sed -i "" "s/\&ndash\;/–/g"
find . -name '*.md' -print0 | xargs -0 sed -i "" "s/\&nbsp\;/ /g"
find . -name '*.md' -print0 | xargs -0 sed -i "" "s/https:\/\/www\.ochrance\.cz\/fileadmin\/user_upload\//\/uploads-import/g"
find . -name '*.md' -print0 | xargs -0 sed -i "" "s/https:\/\/www\.ochrance\.cz\/uploads\//\/uploads-import\/uploads\//g"

# remove icons
find . -name '*.md' -print0 | xargs -0 sed -i "" "s|<img alt=\"\" src=\"https://www.ochrance.cz/typo3/ext/od_linkdesc/icons/pdf.gif\" class=\"od_linkdesc_icon\" \/\> ||g"
find . -name '*.md' -print0 | xargs -0 sed -i "" "s|\<img alt=\"\" src=\"https://www.ochrance.cz/typo3/ext/od_linkdesc/icons/external.gif\" class=\"od_linkdesc_icon_external\" \/\>||g"
find . -name '*.md' -print0 | xargs -0 sed -i "" "s|\<img alt=\"\" src=\"https://www.ochrance.cz/typo3/ext/od_linkdesc/icons/universal.gif\" class=\"od_linkdesc_icon\" />||g"
find . -name '*.md' -print0 | xargs -0 sed -i "" "s|<img alt=\"\" src=\"https://www.ochrance.cz/typo3/ext/od_linkdesc/icons/ppt.gif\" class=\"od_linkdesc_icon\" />||g"
