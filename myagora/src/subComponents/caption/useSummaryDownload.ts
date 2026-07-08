import {useCaption} from './useCaption';
import {useRoomInfo} from 'customization-api';
import {LogSource, logger} from '../../logger/AppBuilderLogger';

const useSummaryDownload = (): {
  downloadSummary: () => Promise<string | null>;
} => {
  const {meetingSummary} = useCaption();
  const {
    data: {meetingTitle},
  } = useRoomInfo();

  const downloadSummary = (): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      try {
        if (!meetingSummary) {
          reject(new Error('No summary content available to download.'));
          return;
        }
        const fileName = meetingTitle
          ? `${meetingTitle.replace(/\s+/g, '_')}_Summary.md`
          : 'Meeting_Summary.md';

        // blob with required content
        const blob = new Blob([meetingSummary], {type: 'text/markdown;charset=utf-8'});

        // url to download content
        const downloadUrl = URL.createObjectURL(blob);

        // anchor ele to download
        const anchor = document.createElement('a');
        anchor.href = downloadUrl;
        anchor.download = fileName;

        // click to download the file
        anchor.click();

        // revoke download url
        URL.revokeObjectURL(downloadUrl);
        logger.debug(
          LogSource.Internals,
          'TRANSCRIPT',
          'summary downloaded successfully',
        );
        resolve(downloadUrl);
      } catch (error) {
        logger.error(
          LogSource.Internals,
          'TRANSCRIPT',
          'failed to download summary',
          error,
        );
        reject(error);
      }
    });
  };

  return {downloadSummary};
};

export default useSummaryDownload;
