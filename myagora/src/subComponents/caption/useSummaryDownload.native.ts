import {useCaption} from './useCaption';
import RNFetchBlob from 'rn-fetch-blob';
import {useRoomInfo} from 'customization-api';
import Share from 'react-native-share';
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
        logger.log(
          LogSource.Internals,
          'TRANSCRIPT',
          'Trying to download summary',
        );
        const fileName = meetingTitle
          ? `${meetingTitle.replace(/\s+/g, '_')}_Summary.md`
          : 'Meeting_Summary.md';

        // get path to the Documents directory
        const documentsDir = RNFetchBlob.fs.dirs.DocumentDir;

        // setting file path
        const filePath = `${documentsDir}/${fileName}`;

        // Writing content to the file
        RNFetchBlob.fs
          .writeFile(filePath, meetingSummary, 'utf8')
          .then(() => {
            logger.warn(
              LogSource.Internals,
              'TRANSCRIPT',
              'Summary downloaded successfully on native',
            );
            // show preview/share
            Share.open({url: `file://${filePath}`, type: 'text/markdown'})
              .then(res => {
                logger.warn(
                  LogSource.Internals,
                  'TRANSCRIPT',
                  'Summary shared successfully:',
                  res,
                );
                resolve(filePath);
              })
              .catch(error => {
                logger.error(
                  LogSource.Internals,
                  'TRANSCRIPT',
                  'Error sharing summary:',
                  error,
                );
                reject(error);
              });

            resolve(filePath);
          })
          .catch(error => {
            logger.error(
              LogSource.Internals,
              'TRANSCRIPT',
              'Error downloading summary:',
              error,
            );
            reject(error);
          });
      } catch (error) {
        logger.error(
          LogSource.Internals,
          'TRANSCRIPT',
          'Error downloading summary:',
          error,
        );
        reject(error);
      }
    });
  };

  return {downloadSummary};
};

export default useSummaryDownload;
