import { PrismaClient, GeneticType, Difficulty } from '@prisma/client';

const prisma = new PrismaClient();

const strains = [
  {
    name: 'Blue Dream',
    genetics: GeneticType.HYBRID,
    floweringWeeks: 9,
    yieldEstimate: '400-600g/m²',
    difficulty: Difficulty.MEDIUM,
    climateSuitability: 'Mediterranean, temperate',
    description:
      'A legendary California strain known for its balanced effects and high yields. Blue Dream combines the relaxing full-body sensation of Blueberry with the invigorating cerebral high of Haze.',
    thcContent: 21.0,
    cbdContent: 0.1,
  },
  {
    name: 'OG Kush',
    genetics: GeneticType.INDICA,
    floweringWeeks: 8,
    yieldEstimate: '300-400g/m²',
    difficulty: Difficulty.HARD,
    climateSuitability: 'Warm, dry',
    description:
      'One of the most famous cannabis strains in the world. OG Kush delivers a heavy, euphoric high with a distinctive earthy, pine, and woody aroma.',
    thcContent: 23.0,
    cbdContent: 0.3,
  },
  {
    name: 'White Widow',
    genetics: GeneticType.HYBRID,
    floweringWeeks: 8,
    yieldEstimate: '450-500g/m²',
    difficulty: Difficulty.EASY,
    climateSuitability: 'Cool, temperate',
    description:
      'A classic Dutch strain renowned for its white crystal resin coating. White Widow offers a powerful burst of euphoria and energy followed by a relaxing body high.',
    thcContent: 20.0,
    cbdContent: 0.2,
  },
  {
    name: 'Northern Lights',
    genetics: GeneticType.INDICA,
    floweringWeeks: 7,
    yieldEstimate: '400-500g/m²',
    difficulty: Difficulty.EASY,
    climateSuitability: 'Cool, northern climates',
    description:
      'One of the most famous pure indica strains ever produced. Northern Lights is known for its resinous buds, fast flowering, and resilience during growth.',
    thcContent: 18.0,
    cbdContent: 0.1,
  },
  {
    name: 'Sour Diesel',
    genetics: GeneticType.SATIVA,
    floweringWeeks: 10,
    yieldEstimate: '350-400g/m²',
    difficulty: Difficulty.MEDIUM,
    climateSuitability: 'Warm, sunny',
    description:
      'A fast-acting, dreamy cerebral effect that has propelled Sour Diesel to legendary status. Named for its pungent, diesel-like aroma, this sativa-dominant strain is a go-to for creative endeavors.',
    thcContent: 22.0,
    cbdContent: 0.2,
  },
  {
    name: 'Girl Scout Cookies',
    genetics: GeneticType.HYBRID,
    floweringWeeks: 9,
    yieldEstimate: '350-450g/m²',
    difficulty: Difficulty.MEDIUM,
    climateSuitability: 'Warm, Mediterranean',
    description:
      'A potent hybrid that delivers a euphoric high alongside feelings of relaxation. GSC features a sweet and earthy aroma with notes of mint, and produces dense, colorful buds.',
    thcContent: 25.0,
    cbdContent: 0.1,
  },
  {
    name: 'Jack Herer',
    genetics: GeneticType.SATIVA,
    floweringWeeks: 10,
    yieldEstimate: '400-500g/m²',
    difficulty: Difficulty.MEDIUM,
    climateSuitability: 'Warm, sunny',
    description:
      'Named after the cannabis activist and author of The Emperor Wears No Clothes, Jack Herer is a sativa-dominant strain combining Haze with Northern Lights and Shiva Skunk.',
    thcContent: 18.0,
    cbdContent: 0.1,
  },
  {
    name: 'Purple Haze',
    genetics: GeneticType.SATIVA,
    floweringWeeks: 11,
    yieldEstimate: '300-400g/m²',
    difficulty: Difficulty.HARD,
    climateSuitability: 'Warm, tropical',
    description:
      'Immortalized by Jimi Hendrix, Purple Haze is a classic sativa-dominant strain known for its vivid purple coloration, sweet berry flavors, and energetic, euphoric high.',
    thcContent: 20.0,
    cbdContent: 0.1,
  },
  {
    name: 'Gorilla Glue',
    genetics: GeneticType.HYBRID,
    floweringWeeks: 8,
    yieldEstimate: '500-600g/m²',
    difficulty: Difficulty.MEDIUM,
    climateSuitability: 'Warm, temperate',
    description:
      'Also known as GG4, Gorilla Glue is famous for its extremely sticky, resin-coated buds. This potent hybrid delivers heavy-handed euphoria and relaxation, leaving you feeling glued to the couch.',
    thcContent: 27.0,
    cbdContent: 0.1,
  },
  {
    name: 'Amnesia Haze',
    genetics: GeneticType.SATIVA,
    floweringWeeks: 11,
    yieldEstimate: '600-700g/m²',
    difficulty: Difficulty.HARD,
    climateSuitability: 'Warm, Mediterranean',
    description:
      'A multiple Cannabis Cup winner, Amnesia Haze is one of the most potent sativa-dominant strains available. It produces an uplifting, cerebral high with a citrusy, earthy flavor profile.',
    thcContent: 22.0,
    cbdContent: 0.1,
  },
];

async function main() {
  console.log('Seeding database with strain data...');

  for (const strain of strains) {
    await prisma.strain.upsert({
      where: { name: strain.name },
      update: strain,
      create: strain,
    });
    console.log(`Upserted strain: ${strain.name}`);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
