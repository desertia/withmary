// MARK: =====================================================
// MARK: 사용자 노출 콘텐츠 다국어 입력 공통 도구
// ============================================================

export const CONTENT_LANGUAGES = Object.freeze([
    {
        code: "ko",
        name: "한국어",
        labels: { title: "제목", body: "본문", message: "메시지" }
    },
    {
        code: "en",
        name: "English",
        labels: { title: "Title", body: "Body", message: "Message" }
    },
    {
        code: "fr",
        name: "Français",
        labels: { title: "Titre", body: "Contenu", message: "Message" }
    },
    {
        code: "es",
        name: "Español",
        labels: { title: "Título", body: "Contenido", message: "Mensaje" }
    }
]);

export const PRIMARY_CONTENT_LANGUAGE = "ko";

export function normalizeTargetLanguages(value) {
    if (!Array.isArray(value) || value.length === 0) {
        return [PRIMARY_CONTENT_LANGUAGE];
    }

    const normalized = [...new Set(value
        .filter((languageCode) => typeof languageCode === "string")
        .map((languageCode) => languageCode.trim().toLowerCase())
        .filter(Boolean))];

    return normalized.length > 0 ? normalized : [PRIMARY_CONTENT_LANGUAGE];
}

export function setupTargetLanguageSelector(root) {
    CONTENT_LANGUAGES.forEach((language) => {
        const inputId = `target-language-${language.code}`;
        const label = document.createElement("label");
        label.className = "check-option";
        label.htmlFor = inputId;

        const input = document.createElement("input");
        input.id = inputId;
        input.name = "targetLanguages";
        input.type = "checkbox";
        input.value = language.code;

        const text = document.createElement("span");
        text.textContent = language.name;
        label.append(input, text);
        root.append(label);
    });

    const inputs = [...root.querySelectorAll('input[name="targetLanguages"]')];

    return {
        inputs,
        selectedCodes() {
            return inputs.filter((input) => input.checked).map((input) => input.value);
        },
        setSelected(value) {
            const selected = new Set(normalizeTargetLanguages(value));
            inputs.forEach((input) => {
                input.checked = selected.has(input.value);
            });
        }
    };
}

function isRecord(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value) {
    return typeof value === "string" ? value : "";
}

export function getContentLocalization(data, languageCode, fieldNames) {
    const localized = isRecord(data?.localizations?.[languageCode])
        ? data.localizations[languageCode]
        : {};

    return Object.fromEntries(fieldNames.map((fieldName) => {
        // 한국어 top-level 필드는 구버전 앱과 Admin의 기준값으로 계속 우선합니다.
        const topLevelValue = languageCode === PRIMARY_CONTENT_LANGUAGE
            ? stringValue(data?.[fieldName])
            : "";
        const value = topLevelValue || stringValue(localized[fieldName]);
        return [fieldName, value];
    }));
}

function createField(language, prefix, field) {
    const wrapper = document.createElement("div");
    wrapper.className = "form-field";

    const inputId = `${prefix}-${language.code}-${field.name}`;
    const label = document.createElement("label");
    label.htmlFor = inputId;
    label.textContent = language.labels[field.name] ?? field.name;

    const input = document.createElement(field.type === "textarea" ? "textarea" : "input");
    input.id = inputId;
    input.name = `localizations[${language.code}][${field.name}]`;
    input.dataset.localizedField = field.name;

    if (field.type === "textarea") {
        input.rows = field.rows ?? 7;
    } else {
        input.type = "text";
    }

    if (field.maxLength) {
        input.maxLength = field.maxLength;
    }

    const placeholder = field.placeholders?.[language.code];
    if (placeholder) {
        input.placeholder = placeholder;
    }

    wrapper.append(label, input);
    return wrapper;
}

export function setupLocalizationEditor(root, { prefix, fields }) {
    const tabList = root.querySelector("[data-localization-tabs]");
    const panels = root.querySelector("[data-localization-panels]");

    CONTENT_LANGUAGES.slice(1).forEach((language) => {
        const panelId = `${prefix}-${language.code}-panel`;
        const tab = document.createElement("button");
        tab.type = "button";
        tab.className = "localization-tab";
        tab.dataset.localeTab = language.code;
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", "false");
        tab.setAttribute("aria-controls", panelId);
        tab.textContent = language.name;

        const panel = document.createElement("section");
        panel.id = panelId;
        panel.className = "localization-panel";
        panel.dataset.localePanel = language.code;
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-label", language.name);
        panel.hidden = true;

        fields.forEach((field) => {
            panel.append(createField(language, prefix, field));
        });

        tabList.append(tab);
        panels.append(panel);
    });

    const tabs = [...root.querySelectorAll("[data-locale-tab]")];
    const localePanels = [...root.querySelectorAll("[data-locale-panel]")];

    function activate(languageCode) {
        tabs.forEach((tab) => {
            const isActive = tab.dataset.localeTab === languageCode;
            tab.classList.toggle("is-active", isActive);
            tab.setAttribute("aria-selected", String(isActive));
            tab.tabIndex = isActive ? 0 : -1;
        });

        localePanels.forEach((panel) => {
            panel.hidden = panel.dataset.localePanel !== languageCode;
        });
    }

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => activate(tab.dataset.localeTab));
    });

    activate(PRIMARY_CONTENT_LANGUAGE);

    return {
        root,
        fields: fields.map((field) => field.name),
        inputs: [...root.querySelectorAll("[data-localized-field]")],
        activate,
        getInput(languageCode, fieldName) {
            return root.querySelector(
                `[data-locale-panel="${languageCode}"] [data-localized-field="${fieldName}"]`
            );
        }
    };
}

export function populateLocalizationEditor(editor, data) {
    CONTENT_LANGUAGES.forEach((language) => {
        const values = getContentLocalization(data, language.code, editor.fields);
        editor.fields.forEach((fieldName) => {
            editor.getInput(language.code, fieldName).value = values[fieldName];
        });
    });
}

export function findIncompleteLocalization(editor) {
    for (const language of CONTENT_LANGUAGES.slice(1)) {
        const inputs = editor.fields.map((fieldName) => editor.getInput(language.code, fieldName));
        const completedCount = inputs.filter((input) => input.value.trim()).length;

        if (completedCount > 0 && completedCount < inputs.length) {
            return {
                language,
                missingInput: inputs.find((input) => !input.value.trim())
            };
        }
    }

    return null;
}

export function findMissingTargetLanguageContent(editor, targetLanguages) {
    for (const languageCode of targetLanguages) {
        const language = CONTENT_LANGUAGES.find(({ code }) => code === languageCode);
        if (!language) {
            continue;
        }

        const missingInput = editor.fields
            .map((fieldName) => editor.getInput(languageCode, fieldName))
            .find((input) => !input.value.trim());

        if (missingInput) {
            return { language, missingInput };
        }
    }

    return null;
}

export function collectLocalizations(editor, existingLocalizations = {}) {
    const supportedCodes = new Set(CONTENT_LANGUAGES.map((language) => language.code));
    const result = {};

    // 아직 Admin UI가 지원하지 않는 향후 언어 데이터는 저장 시 보존합니다.
    if (isRecord(existingLocalizations)) {
        Object.entries(existingLocalizations).forEach(([languageCode, values]) => {
            if (!supportedCodes.has(languageCode) && isRecord(values)) {
                result[languageCode] = { ...values };
            }
        });
    }

    CONTENT_LANGUAGES.forEach((language) => {
        const values = Object.fromEntries(editor.fields.map((fieldName) => [
            fieldName,
            editor.getInput(language.code, fieldName).value.trim()
        ]));
        const hasAllValues = Object.values(values).every(Boolean);

        if (hasAllValues) {
            result[language.code] = values;
        }
    });

    return result;
}

export function getComparableLocalizations(data, fieldNames) {
    const result = {};

    if (isRecord(data?.localizations)) {
        Object.entries(data.localizations).forEach(([languageCode, values]) => {
            if (isRecord(values)) {
                result[languageCode] = Object.fromEntries(fieldNames.map((fieldName) => [
                    fieldName,
                    stringValue(values[fieldName]).trim()
                ]));
            }
        });
    }

    CONTENT_LANGUAGES.forEach((language) => {
        const values = getContentLocalization(data, language.code, fieldNames);
        if (Object.values(values).every((value) => value.trim())) {
            result[language.code] = Object.fromEntries(fieldNames.map((fieldName) => [
                fieldName,
                values[fieldName].trim()
            ]));
        } else {
            delete result[language.code];
        }
    });

    return Object.fromEntries(Object.entries(result).sort(([left], [right]) => left.localeCompare(right)));
}
