import type { StoredParentData } from '../lib/parentStorage';
import { ParentDataImporter } from './ParentDataImporter';

type ImportScreenProps = {
  onImported: (data: StoredParentData) => void;
};

export function ImportScreen({ onImported }: ImportScreenProps) {
  return (
    <main className="app">
      <section className="welcome">
        <div className="welcome-brand">
          <img
            className="welcome-brand__logo"
            src={`${import.meta.env.BASE_URL}Cheval.png`}
            alt=""
          />

          <h1 lang="ja">因子厳選</h1>
        </div>

        <p className="welcome__heading">Start by importing your Parent Data.</p>

        <p className="welcome__description">
          Import any supported <strong>.json</strong> file, or enter the Trainer UID of an account
          that has uploaded its Parent Data to uma.moe.
        </p>

        <p className="welcome__description">
          If you do not have a JSON file yet, you can extract one using{' '}
          <a href="https://github.com/Werseter/umadump" target="_blank" rel="noreferrer">
            UmaDump
          </a>{' '}
          or{' '}
          <a
            href="https://github.com/xancia/UmaExtractor/releases"
            target="_blank"
            rel="noreferrer"
          >
            UmaExtractor
          </a>
          .
        </p>

        <ParentDataImporter onImported={onImported} />
      </section>
    </main>
  );
}
