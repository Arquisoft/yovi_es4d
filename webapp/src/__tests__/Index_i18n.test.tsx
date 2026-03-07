import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { describe, test, expect } from 'vitest'
import { I18nProvider, useTranslation } from '../i18n'
import React from 'react'

const resources = {
  en: {
    home: {
      title: "Home"
    }
  },
  es: {
    home: {
      title: "Inicio"
    }
  }
}

function TestComponent() {
  const { t, setLang } = useTranslation()

  return (
    <div>
      <span data-testid="text">{t("home.title")}</span>
      <span data-testid="missing">{t("home.missing", "fallback")}</span>
      <span data-testid="missing-no-fallback">{t("home.missing2")}</span>
      <button onClick={() => setLang("es")}>change</button>
    </div>
  )
}

function BadComponent() {
  useTranslation();
  return null;
}

describe("useTranslation", () => {

  test("throws error when used outside I18nProvider", () => {
    expect(() => render(<BadComponent />)).toThrow(
      "useTranslation must be used inside I18nProvider"
    );
  });

describe("I18nProvider", () => {

  test("renders translation with default language", () => {

    render(
      <I18nProvider defaultLang="en" resources={resources}>
        <TestComponent />
      </I18nProvider>
    )

    expect(screen.getByTestId("text")).toHaveTextContent("Home")
  })

  test("returns fallback when translation missing", () => {

    render(
      <I18nProvider defaultLang="en" resources={resources}>
        <TestComponent />
      </I18nProvider>
    )

    expect(screen.getByTestId("missing")).toHaveTextContent("fallback")
  })

  test("returns key when translation missing and no fallback", () => {

    render(
      <I18nProvider defaultLang="en" resources={resources}>
        <TestComponent />
      </I18nProvider>
    )

    expect(screen.getByTestId("missing-no-fallback")).toHaveTextContent("home.missing2")
  })

  test("changes language when setLang is called", async () => {

    const user = userEvent.setup()

    render(
      <I18nProvider defaultLang="en" resources={resources}>
        <TestComponent />
      </I18nProvider>
    )

    const button = screen.getByRole("button", { name: "change" })

    await user.click(button)

    expect(screen.getByTestId("text")).toHaveTextContent("Inicio")
  })

  test("returns fallback when language does not exist", () => {

  const resources = {
    en: { home: { title: "Home" } }
  }

  function Test() {
    const { t } = useTranslation()
    return <span>{t("home.title", "fallback")}</span>
  }

  render(
    <I18nProvider defaultLang="fr" resources={resources}>
      <Test />
    </I18nProvider>
  )

  expect(screen.getByText("fallback")).toBeInTheDocument()
})

    test("returns fallback when nested key path breaks", () => {

    const resources = {
        en: {
        home: {
            title: "Home"
        }
        }
    }

    function Test() {
        const { t } = useTranslation()
        return <span>{t("home.title.text", "fallback")}</span>
    }

    render(
        <I18nProvider defaultLang="en" resources={resources}>
        <Test />
        </I18nProvider>
    )

    expect(screen.getByText("fallback")).toBeInTheDocument()
    })

    })

    test("returns key when path breaks and no fallback provided", () => {

    const resources = {
        en: {
        home: {
            title: "Home"
        }
        }
    }

    function Test() {
        const { t } = useTranslation()
        return <span>{t("home.title.text")}</span>
    }

    render(
        <I18nProvider defaultLang="en" resources={resources}>
        <Test />
        </I18nProvider>
    )

    expect(screen.getByText("home.title.text")).toBeInTheDocument()
    })

})